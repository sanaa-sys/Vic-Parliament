// src/App.jsx
import { useState } from 'react';
import ProgressBar from './components/ProgressBar';
import Step1 from './components/Step1';
import Step2 from './components/Step2';
import Step3 from './components/Step3';
import Step4 from './components/Step4';

export default function App() {
  const [step,      setStep]      = useState(1);
  const [lookup,    setLookup]    = useState(null);  // postcode lookup result
  const [selection, setSelection] = useState(null);  // chosen recipients
  const [email,     setEmail]     = useState(null);  // subject + body

  function goStep(n) {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Step 1 → 2: postcode resolved
  function handleStep1(data) {
    setLookup(data);
    goStep(2);
  }

  // Step 2 → 3: recipients chosen
  function handleStep2(data) {
    setSelection(data);
    goStep(3);
  }

  // Step 3 → 4: email drafted
  function handleStep3(data) {
    setEmail(data);
    goStep(4);
  }

  return (
    <div className="container">
      <ProgressBar step={step} />

      {step === 1 && (
        <Step1 onNext={handleStep1} />
      )}

      {step === 2 && lookup && (
        <Step2
          lookup={lookup}
          onNext={handleStep2}
          onBack={() => goStep(1)}
        />
      )}

      {step === 3 && lookup && selection && (
        <Step3
          lookup={lookup}
          selection={selection}
          onNext={handleStep3}
          onBack={() => goStep(2)}
        />
      )}

      {step === 4 && selection && email && (
        <Step4
          selection={selection}
          email={email}
          onBack={() => goStep(3)}
        />
      )}
    </div>
  );
}
