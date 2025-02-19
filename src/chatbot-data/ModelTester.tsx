import React, { useState } from "react";
import { chatbotService } from "../services/firebase";
import { trainingData } from "./trainingData";
import { analyzeSentiment, getEmotionallyAwareResponse } from "./sentimentAnalyzer";

interface PredictionResult {
  intent: string;
  confidence: number;
  responses: string[];
  allProbabilities: Array<{
    intent: string;
    probability: number;
  }>;
}

interface ModelOutput {
  input: string;
  predictedIntent: string;
  confidence: number;
  timestamp: string;
  responses: string[];
  sentiment?: {
    score: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    emotions: {
      anger: number;
      frustration: number;
      satisfaction: number;
      urgency: number;
    };
  };
}

const ModelTester: React.FC = () => {
  const [input, setInput] = useState("");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [modelOutputs, setModelOutputs] = useState<ModelOutput[]>([]);

  const handlePredict = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      console.log("Input text:", input);
      const result = await chatbotService.predictIntent(input);
      console.log("Raw prediction result:", result);
      setPrediction(result);

      // Analyze sentiment
      const sentimentResult = analyzeSentiment(input);
      
      // Get emotionally aware response
      const selectedResponse = getEmotionallyAwareResponse(
        result.intent,
        sentimentResult,
        result.responses
      );

      // Update responses with emotionally aware one
      result.responses = [selectedResponse, ...result.responses.filter(r => r !== selectedResponse)];

      // Add new output to history
      const newOutput: ModelOutput = {
        input: input,
        predictedIntent: result.intent,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
        responses: result.responses,
        sentiment: sentimentResult
      };
      setModelOutputs((prev) => [newOutput, ...prev]);

      // Capture debug info
      setDebugInfo({
        inputText: input,
        tokenizedInput: input.toLowerCase().split(" "),
        sentiment: sentimentResult,
        timestamp: new Date().toISOString(),
        modelLoaded: !!chatbotService.modelData,
      });
    } catch (err: any) {
      console.error("Prediction error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Model Tester</h2>

      <div className="mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to test..."
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        onClick={handlePredict}
        disabled={loading || !input.trim()}
        className={`px-4 py-2 rounded ${
          loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
        } text-white`}
      >
        {loading ? "Predicting..." : "Predict Intent"}
      </button>

      {error && (
        <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {prediction && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Prediction Results:</h3>
          <div className="bg-gray-100 p-4 rounded">
            <p className="mb-2">
              <span className="font-semibold">Predicted Intent:</span>{" "}
              {prediction.intent}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Confidence:</span>{" "}
              {(prediction.confidence * 100).toFixed(2)}%
            </p>
            {modelOutputs[0]?.sentiment && (
              <div className="mb-2">
                <p className="font-semibold">Sentiment Analysis:</p>
                <div className="pl-4">
                  <p>Sentiment: {modelOutputs[0].sentiment.sentiment}</p>
                  <p>Score: {modelOutputs[0].sentiment.score.toFixed(2)}</p>
                  <p className="font-semibold mt-2">Emotions:</p>
                  <div className="pl-4">
                    {Object.entries(modelOutputs[0].sentiment.emotions).map(([emotion, score]) => (
                      <p key={emotion}>
                        {emotion}: {score.toFixed(2)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div>
              <h4 className="font-semibold mb-2">All Probabilities:</h4>
              <div className="space-y-1">
                {prediction.allProbabilities
                  .sort((a, b) => b.probability - a.probability)
                  .map((prob) => (
                    <div
                      key={prob.intent}
                      className={`flex justify-between text-sm ${
                        prob.intent === prediction.intent ? "font-bold" : ""
                      }`}
                    >
                      <span>{prob.intent}:</span>
                      <span>{(prob.probability * 100).toFixed(2)}%</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {prediction && modelOutputs.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Available Responses:</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Options
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {modelOutputs[0]?.responses.map((response, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{response}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {debugInfo && (
        <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
          <h4 className="font-semibold mb-2">Debug Information:</h4>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      {modelOutputs.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Model Output History:</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Input
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Predicted Intent
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {modelOutputs.map((output, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {new Date(output.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-sm">{output.input}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {output.predictedIntent}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {(output.confidence * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelTester;