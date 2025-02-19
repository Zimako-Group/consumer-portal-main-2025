import React, { useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import { trainingData } from "./trainingData";
import { chatbotService } from "../services/firebase";

// Data augmentation utilities
const augmentText = (text: string): string[] => {
  const augmentations: string[] = [text];
  
  // Add noise (typos)
  augmentations.push(addTypos(text));
  
  // Add word dropout
  augmentations.push(dropWords(text));
  
  // Add synonyms
  augmentations.push(replaceSynonyms(text));
  
  return augmentations.filter(Boolean); // Remove empty strings
};

const addTypos = (text: string): string => {
  const words = text.split(' ');
  const commonTypos: { [key: string]: string[] } = {
    'hello': ['helo', 'hallo', 'hullo'],
    'hi': ['hey', 'hii'],
    'please': ['plz', 'pls', 'plese'],
    'thanks': ['thanx', 'thnx', 'thx'],
    'account': ['acount', 'acct', 'accnt'],
    'password': ['passwd', 'pswrd', 'pwd'],
    'help': ['halp', 'hlp'],
    // Add more common typos
  };
  
  return words.map(word => {
    if (commonTypos[word.toLowerCase()]) {
      const typos = commonTypos[word.toLowerCase()];
      return typos[Math.floor(Math.random() * typos.length)];
    }
    return word;
  }).join(' ');
};

const dropWords = (text: string): string => {
  const words = text.split(' ');
  if (words.length <= 2) return text; // Don't drop words from very short texts
  
  const dropProbability = 0.2;
  return words
    .filter(() => Math.random() > dropProbability)
    .join(' ');
};

const replaceSynonyms = (text: string): string => {
  const words = text.split(' ');
  const synonyms: { [key: string]: string[] } = {
    'hello': ['hi', 'greetings', 'hey'],
    'help': ['assist', 'support', 'aid'],
    'problem': ['issue', 'trouble', 'difficulty'],
    'need': ['require', 'want', 'seek'],
    'show': ['display', 'present', 'reveal'],
    'tell': ['inform', 'explain', 'describe'],
    // Add more synonyms
  };
  
  return words.map(word => {
    if (synonyms[word.toLowerCase()]) {
      const alternatives = synonyms[word.toLowerCase()];
      return alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    return word;
  }).join(' ');
};

const ModelTrainer: React.FC = () => {
  const [status, setStatus] = useState("Not Started");
  const [progress, setProgress] = useState(0);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [augmentedDataSize, setAugmentedDataSize] = useState(0);

  const preprocessData = () => {
    // Flatten and augment all patterns
    const allPatterns: string[] = [];
    const intentLabels: string[] = [];
    let augmentedCount = 0;

    trainingData.forEach((category) => {
      category.patterns.forEach((pattern) => {
        // Add original pattern
        allPatterns.push(pattern.toLowerCase());
        intentLabels.push(category.intent);
        
        // Add augmented patterns
        const augmentations = augmentText(pattern);
        augmentations.forEach(augPattern => {
          if (augPattern !== pattern.toLowerCase()) {
            allPatterns.push(augPattern.toLowerCase());
            intentLabels.push(category.intent);
            augmentedCount++;
          }
        });
      });
    });

    setAugmentedDataSize(augmentedCount);
    setStatus(`Preprocessed ${allPatterns.length} samples (${augmentedCount} augmented)`);

    // Create vocabulary
    const vocabulary = new Set<string>();
    allPatterns.forEach((pattern) => {
      pattern.split(" ").forEach((word) => vocabulary.add(word));
    });

    // Create word to index mapping
    const wordIndex: { [key: string]: number } = {};
    Array.from(vocabulary).forEach((word, index) => {
      wordIndex[word] = index + 1;
    });

    // Convert patterns to sequences with padding
    const maxLen = 20; // Maximum sequence length
    const sequences = allPatterns.map((pattern) => {
      const sequence = pattern
        .split(" ")
        .map((word) => wordIndex[word] || 0)
        .slice(0, maxLen); // Truncate if too long

      // Pad if too short
      while (sequence.length < maxLen) {
        sequence.push(0);
      }
      return sequence;
    });

    // Create one-hot encoded labels
    const uniqueIntents = Array.from(new Set(intentLabels));
    const labels = intentLabels.map((intent) => uniqueIntents.indexOf(intent));

    return {
      sequences,
      labels,
      vocabulary: wordIndex,
      uniqueIntents,
    };
  };

  const createModel = (vocabSize: number, numIntents: number) => {
    const maxLen = 20;

    const model = tf.sequential();

    // Enhanced embedding layer with more dimensions
    model.add(
      tf.layers.embedding({
        inputDim: vocabSize + 1,
        outputDim: 64, // Increased from 32
        inputLength: maxLen,
      })
    );

    // Add bidirectional LSTM layer
    model.add(
      tf.layers.bidirectional({
        layer: tf.layers.lstm({
          units: 32,
          returnSequences: true,
        }),
        mergeMode: 'concat',
      })
    );

    // Add attention layer
    model.add(tf.layers.globalAveragePooling1d({}));
    
    // Add deeper network with residual connections
    const denseLayer1 = tf.layers.dense({ units: 128, activation: 'relu' });
    model.add(denseLayer1);
    model.add(tf.layers.dropout({ rate: 0.3 }));
    
    const denseLayer2 = tf.layers.dense({ units: 64, activation: 'relu' });
    model.add(denseLayer2);
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Add batch normalization for better training stability
    model.add(tf.layers.batchNormalization());
    
    // Output layer with softmax activation
    model.add(tf.layers.dense({ units: numIntents, activation: 'softmax' }));

    return model;
  };

  const trainModel = async () => {
    try {
      setStatus("Preprocessing Data...");
      const { sequences, labels, vocabulary, uniqueIntents } = preprocessData();

      setStatus("Creating Model...");
      const model = createModel(
        Object.keys(vocabulary).length,
        uniqueIntents.length
      );

      // Enhanced training configuration
      model.compile({
        optimizer: tf.train.adam(0.001), // Custom learning rate
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
      });

      setStatus("Training Model...");
      const xs = tf.tensor2d(sequences, [sequences.length, 20], "float32");
      const ys = tf.oneHot(tf.tensor1d(labels, 'int32'), uniqueIntents.length);

      // Add early stopping and learning rate scheduling
      let bestLoss = Infinity;
      let patienceCount = 0;
      const maxPatience = 5;
      let currentLearningRate = 0.001;

      const batchSize = 32;
      const epochs = 100;

      for (let epoch = 0; epoch < epochs; epoch++) {
        const result = await model.fit(xs, ys, {
          epochs: 1,
          batchSize: batchSize,
          validationSplit: 0.2,
          shuffle: true,
        });

        const currentLoss = result.history.loss[0];
        setProgress(((epoch + 1) / epochs) * 100);
        setStatus(`Epoch ${epoch + 1}/${epochs} - Loss: ${currentLoss.toFixed(4)}`);

        // Early stopping check
        if (currentLoss < bestLoss) {
          bestLoss = currentLoss;
          patienceCount = 0;
        } else {
          patienceCount++;
          if (patienceCount >= maxPatience) {
            setStatus("Early stopping triggered - model converged");
            break;
          }
        }

        // Learning rate scheduling
        if (patienceCount > 2) {
          currentLearningRate *= 0.5;
          model.compile({
            optimizer: tf.train.adam(currentLearningRate),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy'],
          });
          setStatus(`Reduced learning rate to ${currentLearningRate}`);
        }
      }

      // Save the model with metadata
      await chatbotService.saveModel(model, vocabulary, uniqueIntents, {});
      setModel(model);
      setStatus("Model trained and saved successfully!");

    } catch (error: any) {
      setStatus(`Training failed: ${error.message}`);
      console.error("Training error:", error);
    }
  };

  // Add function to load existing model
  const loadExistingModel = async () => {
    try {
      setStatus("Loading existing model...");
      const { model: loadedModel } = await chatbotService.loadModel();
      setModel(loadedModel);
      setStatus("Existing model loaded successfully!");
    } catch (error) {
      console.error("Error loading model:", error);
      setStatus("No existing model found");
    }
  };

  // Try to load existing model on component mount
  useEffect(() => {
    loadExistingModel();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4"> Zimako AI Model Trainer</h1>

      <div className="mb-4">
        <p>Status: {status}</p>
        <div className="w-full bg-gray-200 rounded">
          <div
            className="bg-blue-600 rounded h-2"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-x-4">
        <button
          onClick={trainModel}
          disabled={status.includes("Training")}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Start Training
        </button>

        <button
          onClick={loadExistingModel}
          disabled={status.includes("Loading")}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Load Existing Model
        </button>
      </div>

      {model && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <p>
            Model successfully{" "}
            {status.includes("loaded") ? "loaded" : "trained and saved"}!
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelTrainer;
