// pages/train-model.tsx
import React from 'react';
import ModelTrainer from '../chatbot-data/modelTrainer';
import ModelTester from '../chatbot-data/ModelTester';

const TrainingPage: React.FC = () => {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Chatbot Model Training</h1>
      <ModelTrainer />
      <ModelTester />
    </div>
  );
};

export default TrainingPage;