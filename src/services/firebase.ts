import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  getBytes,
} from "firebase/storage";
import { auth, db, storage } from "../firebaseConfig";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

// Initialize TensorFlow.js backend
async function initTensorFlow() {
  await tf.ready();
  await tf.setBackend('webgl');
  console.log('TensorFlow.js initialized with backend:', tf.getBackend());
}

// Initialize TensorFlow.js
initTensorFlow().catch(err => {
  console.error('Error initializing TensorFlow:', err);
});

// No need to manually register layers as they are built into TensorFlow.js

interface ModelData {
  model: tf.LayersModel;
  vocabulary: { [key: string]: number };
  intents: string[];
  responses: { [key: string]: string[] };
}

interface PredictionResult {
  intent: string;
  confidence: number;
  responses: string[];
  allProbabilities: Array<{
    intent: string;
    probability: number;
  }>;
}

export const signUpUser = async (
  email: string,
  password: string,
  userData: any
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await sendEmailVerification(user);

    await setDoc(doc(db, "users", user.uid), {
      ...userData,
      emailVerified: false,
      createdAt: new Date().toISOString(),
    });

    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    if (!user.emailVerified) {
      throw new Error("Please verify your email before logging in");
    }

    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const chatbotService = {
  modelData: null as ModelData | null,

  async saveModel(
    model: tf.LayersModel,
    vocabulary: any,
    intents: string[],
    responses: { [key: string]: string[] }
  ) {
    try {
      // Save model structure
      const modelTopology = model.toJSON();
      const modelData = {
        modelTopology: modelTopology,
        weightsManifest: [{
          paths: ["weights.bin"],
          weights: model.getWeights().map(w => ({
            name: w.name,
            shape: w.shape,
            dtype: w.dtype
          }))
        }]
      };

      // Save model.json
      const modelJsonRef = ref(storage, "chatbot/model.json");
      const modelJsonBlob = new Blob([JSON.stringify(modelData)], {
        type: "application/json",
      });
      await uploadBytes(modelJsonRef, modelJsonBlob);

      // Save weights.bin
      const weightsData = await model.getWeights();
      const weightsBlob = new Blob([weightsData], {
        type: "application/octet-stream",
      });
      const weightsRef = ref(storage, "chatbot/weights.bin");
      await uploadBytes(weightsRef, weightsBlob);

      // Save metadata and responses
      const metadata = {
        vocabulary,
        intents,
        responses,
        updatedAt: new Date().toISOString(),
        version: "1.0"
      };
      
      const metadataRef = ref(storage, "chatbot/metadata.json");
      const metadataBlob = new Blob([JSON.stringify(metadata)], {
        type: "application/json",
      });
      await uploadBytes(metadataRef, metadataBlob);

      console.log("Model, weights, and responses saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving model:", error);
      throw error;
    }
  },

  async loadModel() {
    try {
      console.log("Starting model loading process...");

      // Ensure TensorFlow is ready
      await tf.ready();
      console.log('TensorFlow.js ready with backend:', tf.getBackend());

      // Load metadata and responses
      const metadataResponse = await fetch('http://localhost:3000/api/model/metadata', {
        cache: 'no-store'
      });
      if (!metadataResponse.ok) {
        throw new Error('Failed to load metadata');
      }
      const metadata = await metadataResponse.json();
      console.log("Metadata loaded successfully:", metadata);

      // Calculate vocabulary size
      const vocabSize = Object.keys(metadata.vocabulary).length;
      if (!vocabSize) {
        throw new Error('Invalid vocabulary size in metadata');
      }
      console.log("Vocabulary size:", vocabSize);

      // Load model structure
      const modelResponse = await fetch('http://localhost:3000/api/model/structure', {
        cache: 'no-store'
      });
      if (!modelResponse.ok) {
        throw new Error('Failed to load model structure');
      }
      const modelStructure = await modelResponse.json();
      console.log("Model structure received");

      // Load weights with proper binary handling
      const weightsResponse = await fetch('http://localhost:3000/api/model/weights', {
        headers: {
          'Accept': 'application/octet-stream',
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!weightsResponse.ok) {
        const errorText = await weightsResponse.text();
        console.error('Server response:', errorText);
        throw new Error(`Failed to load weights: ${weightsResponse.status} ${weightsResponse.statusText}`);
      }

      // Get content length
      const contentLength = weightsResponse.headers.get('content-length');
      console.log('Content length:', contentLength);

      // Get the array buffer
      const rawBuffer = await weightsResponse.arrayBuffer();
      console.log('Raw buffer details:', {
        byteLength: rawBuffer.byteLength,
        matchesContentLength: contentLength ? rawBuffer.byteLength === parseInt(contentLength) : 'unknown',
        isMultipleOf4: rawBuffer.byteLength % 4 === 0,
        remainder: rawBuffer.byteLength % 4
      });

      // Create aligned buffer
      const remainder = rawBuffer.byteLength % 4;
      const paddingNeeded = remainder > 0 ? 4 - remainder : 0;
      const alignedLength = rawBuffer.byteLength + paddingNeeded;
      
      console.log('Buffer alignment:', {
        originalSize: rawBuffer.byteLength,
        paddingNeeded,
        alignedLength,
        isAlignedMultipleOf4: alignedLength % 4 === 0
      });

      // Create new aligned buffer
      const alignedBuffer = new ArrayBuffer(alignedLength);
      new Uint8Array(alignedBuffer).set(new Uint8Array(rawBuffer));

      // Create Float32Array from the aligned buffer
      const weightData = new Float32Array(alignedBuffer);
      console.log('Weight data details:', {
        floatLength: weightData.length,
        expectedFromBytes: alignedBuffer.byteLength / 4,
        firstFewValues: Array.from(weightData.slice(0, 5)),
        lastFewValues: Array.from(weightData.slice(-5))
      });

      // Calculate total expected weights
      const totalWeights = modelStructure.weightsManifest[0].weights.reduce((sum, spec) => {
        return sum + spec.shape.reduce((a, b) => a * b, 1);
      }, 0);
      
      console.log('Weight validation:', {
        receivedFloats: weightData.length,
        expectedFloats: totalWeights,
        receivedBytes: alignedBuffer.byteLength,
        expectedBytes: totalWeights * 4,
        match: weightData.length >= totalWeights,
        difference: totalWeights - weightData.length
      });

      if (weightData.length < totalWeights) {
        throw new Error(`Not enough weight data: got ${weightData.length} floats but need ${totalWeights}`);
      }

      // Create the model
      const model = tf.sequential();

      // Add embedding layer with correct vocabulary size
      model.add(tf.layers.embedding({
        inputDim: vocabSize + 1,
        outputDim: 64,
        inputLength: 20,
        name: 'embedding_1'
      }));

      model.add(tf.layers.bidirectional({
        layer: tf.layers.lstm({
          units: 32,
          returnSequences: true,
          name: 'lstm_1'
        }),
        mergeMode: 'concat',
        name: 'bidirectional_1'
      }));

      model.add(tf.layers.globalAveragePooling1d({
        name: 'global_average_pooling1d_1'
      }));

      model.add(tf.layers.dense({
        units: 128,
        activation: 'relu',
        name: 'dense_1'
      }));
      model.add(tf.layers.dropout({
        rate: 0.3,
        name: 'dropout_1'
      }));
      model.add(tf.layers.dense({
        units: 64,
        activation: 'relu',
        name: 'dense_2'
      }));
      model.add(tf.layers.dropout({
        rate: 0.2,
        name: 'dropout_2'
      }));
      model.add(tf.layers.batchNormalization({
        name: 'batch_normalization_1'
      }));

      const numIntents = metadata.intents.length;
      if (!numIntents) {
        throw new Error('Invalid number of intents in metadata');
      }
      console.log("Number of intents:", numIntents);

      model.add(tf.layers.dense({
        units: numIntents,
        activation: 'softmax',
        name: 'dense_3'
      }));

      // Load weights
      const weights = [];
      let offset = 0;

      for (const spec of modelStructure.weightsManifest[0].weights) {
        const size = spec.shape.reduce((a, b) => a * b);
        console.log(`Processing weight with shape [${spec.shape.join(', ')}], size ${size}`);
        
        if (offset + size > weightData.length) {
          throw new Error(`Not enough weight data: need ${size} more values but only ${weightData.length - offset} remaining`);
        }
        
        const value = weightData.slice(offset, offset + size);
        const tensor = tf.tensor(Array.from(value), spec.shape);
        weights.push(tensor);
        offset += size;
      }

      model.setWeights(weights);
      console.log("Model weights set successfully");

      this.modelData = {
        model,
        vocabulary: metadata.vocabulary,
        intents: metadata.intents,
        responses: metadata.responses,
      };

      return this.modelData;
    } catch (error: any) {
      console.error("Detailed error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw new Error(`Failed to load model: ${error.message}`);
    }
  },

  async predictIntent(text: string): Promise<PredictionResult> {
    try {
      if (!this.modelData) {
        await this.loadModel();
        if (!this.modelData) {
          throw new Error("Failed to load model");
        }
      }

      const normalizedText = text
        .toLowerCase()
        .replace(/[.,!?]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const tokens = normalizedText.split(" ");
      const bigrams = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
      }

      const allFeatures = [...tokens, ...bigrams];
      console.log("Features:", allFeatures);

      const sequence = allFeatures.map((feature) => {
        const tokenIndex =
          this.modelData!.vocabulary[feature] ||
          this.modelData!.vocabulary["<UNK>"] ||
          0;
        console.log(`Feature: "${feature}", Index: ${tokenIndex}`);
        return tokenIndex;
      });

      console.log("Final sequence:", sequence);

      const maxLength = 20;
      const paddedSequence = sequence.slice(0, maxLength);
      while (paddedSequence.length < maxLength) {
        paddedSequence.push(0);
      }

      const inputTensor = tf.tensor2d([paddedSequence], [1, maxLength]);
      const predictions = (await this.modelData.model.predict(
        inputTensor
      )) as tf.Tensor;

      const probabilities = await predictions.data();
      const maxIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));

      inputTensor.dispose();
      predictions.dispose();

      const predictedIntent = this.modelData.intents[maxIndex];
      const intentResponses = this.modelData.responses[predictedIntent] || [
        "I understand your request, but I'm not sure how to respond. Could you please rephrase?",
        "I'm still learning about this topic. Could you try asking in a different way?",
        "I want to help, but I need more information. Could you provide more details?"
      ];

      // Select a random response
      const randomResponse = intentResponses[Math.floor(Math.random() * intentResponses.length)];

      return {
        intent: predictedIntent,
        confidence: probabilities[maxIndex],
        responses: [randomResponse],
        allProbabilities: Array.from(probabilities).map((prob, idx) => ({
          intent: this.modelData!.intents[idx],
          probability: prob,
        })),
      };
    } catch (error: any) {
      console.error("Prediction error:", error);
      throw new Error(`Failed to predict intent: ${error.message}`);
    }
  },
};
