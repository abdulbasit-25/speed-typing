import { ArrowRight, Check, Clock3, EyeOff, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { calculateWordPracticeMetrics } from "../lib/wordTyping.js";

const roundDurationSeconds = 60;
const wordBank = [
  "cadence", "clarity", "compass", "craft", "current", "deliberate", "ember", "focus",
  "forward", "harbor", "horizon", "intent", "journey", "kinetic", "lantern", "method",
  "momentum", "pattern", "precision", "purpose", "rhythm", "signal", "steady", "thrive",
  "vector", "velocity", "vivid", "wander", "whisper", "willpower",
];

type GamePhase = "ready" | "showing" | "input" | "finished";

export function WordTypingPage() {
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [word, setWord] = useState("");
  const [entry, setEntry] = useState("");
  const [displaySeconds, setDisplaySeconds] = useState(2);
  const [timeLeft, setTimeLeft] = useState(roundDurationSeconds);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [correctWords, setCorrectWords] = useState(0);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "showing") return;
    const timeout = window.setTimeout(() => {
      setEntry("");
      setPhase("input");
    }, displaySeconds * 1000);
    return () => window.clearTimeout(timeout);
  }, [displaySeconds, phase, word]);

  useEffect(() => {
    if (deadline === null || phase === "ready" || phase === "finished") return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) setPhase("finished");
    }, 100);
    return () => window.clearInterval(interval);
  }, [deadline, phase]);

  useEffect(() => {
    if (phase === "input") inputRef.current?.focus();
  }, [phase]);

  function startRound() {
    setCorrectWords(0);
    setErrors(0);
    setFeedback("");
    setEntry("");
    setTimeLeft(roundDurationSeconds);
    setDeadline(Date.now() + roundDurationSeconds * 1000);
    setWord(nextWord(""));
    setPhase("showing");
  }

  function submitWord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "input") return;
    if (deadline !== null && Date.now() >= deadline) {
      setTimeLeft(0);
      setPhase("finished");
      return;
    }
    if (entry.trim().toLocaleLowerCase() !== word.toLocaleLowerCase()) {
      setErrors((count) => count + 1);
      setFeedback("Not quite. Try to recall the word and enter it again.");
      setEntry("");
      return;
    }
    setCorrectWords((count) => count + 1);
    setFeedback("Correct. Remember the next one.");
    setWord(nextWord(word));
    setEntry("");
    setPhase("showing");
  }

  const elapsedSeconds = roundDurationSeconds - timeLeft;
  const metrics = calculateWordPracticeMetrics(correctWords, errors, elapsedSeconds);

  return (
    <main className="content-width page-content word-page">
      <div className="page-kicker"><span className="eyebrow">PRACTICE MODULE / WORD FLASH</span><span className="word-practice-badge">NOT AN OFFICIAL RESULT</span></div>
      <div className="word-intro">
        <div>
          <h1 className="page-title">See it.<br />Keep it<span className="title-period">.</span></h1>
          <p className="page-intro">A word appears for a moment, then disappears. Type what you remember before the next one arrives.</p>
        </div>
        <div className="word-how-to"><span className="eyebrow">HOW TO PLAY</span><p>Memorize the word while it is visible. Type it from memory when it vanishes. You have 60 seconds.</p></div>
      </div>

      <section className="word-game-panel" aria-label="Word Flash practice game">
        <div className="word-game-topline">
          <span className="eyebrow">{phase === "ready" ? "READY WHEN YOU ARE" : phase === "finished" ? "PRACTICE ROUND COMPLETE" : phase === "showing" ? "MEMORIZE THIS WORD" : "TYPE THE HIDDEN WORD"}</span>
          {phase !== "ready" && <span className={`word-time${timeLeft <= 10 ? " time-urgent" : ""}`}><Clock3 size={16} />{timeLeft}<small>SEC</small></span>}
        </div>

        <div className={`word-prompt word-phase-${phase}`} aria-live="polite" aria-atomic="true">
          {phase === "showing" ? <strong key={word}>{word}</strong> : phase === "input" ? <><EyeOff size={20} /><span>WORD HIDDEN</span></> : phase === "finished" ? <span>TIME</span> : <span className="word-placeholder">?</span>}
        </div>

        {phase === "ready" && <div className="word-ready-controls">
          <label className="field-label" htmlFor="word-display-seconds">Word display time
            <select id="word-display-seconds" className="text-input" value={displaySeconds} onChange={(event) => setDisplaySeconds(Number(event.target.value))}>
              <option value={1}>1 second</option><option value={2}>2 seconds</option><option value={3}>3 seconds</option>
            </select>
          </label>
          <button className="button button-red" onClick={startRound}>Start 60-second round <ArrowRight size={16} /></button>
        </div>}

        {phase === "input" && <form className="word-entry-form" onSubmit={submitWord}>
          <label className="sr-only" htmlFor="word-entry">Type the hidden word</label>
          <input ref={inputRef} id="word-entry" className="text-input word-entry-input" value={entry} onChange={(event) => setEntry(event.target.value)} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Type the word from memory" />
          <button className="button button-dark" type="submit">Check word <Check size={16} /></button>
          <p className={`word-feedback${errors > 0 && feedback.startsWith("Not") ? " feedback-error" : ""}`} aria-live="polite">{feedback || "Press Enter or Check word to continue."}</p>
        </form>}

        {(phase === "showing" || phase === "input") && <div className="word-round-stats"><span><strong>{correctWords}</strong> words recalled</span><span><strong>{errors}</strong> misses</span><span><strong>{displaySeconds}s</strong> reveal time</span></div>}

        {phase === "finished" && <div className="word-result">
          <div><span className="eyebrow">WORDS PER MINUTE</span><strong>{metrics.wordsPerMinute.toFixed(1)}</strong></div>
          <div><span className="eyebrow">ACCURACY</span><strong>{metrics.accuracy.toFixed(1)}%</strong></div>
          <div><span className="eyebrow">WORDS RECALLED</span><strong>{correctWords}</strong></div>
          <div><span className="eyebrow">MISSES</span><strong>{errors}</strong></div>
          <button className="button button-dark" onClick={startRound}><RotateCcw size={15} />Try another round</button>
        </div>}
      </section>

      <p className="word-practice-note">This is a practice drill. Its score is calculated in your browser and is not sent to or included in the official competition leaderboard.</p>
      <div className="word-page-links"><Link to="/compete">Enter the official typing challenge <ArrowRight size={15} /></Link><Link to="/leaderboard">View competition rankings <ArrowRight size={15} /></Link></div>
    </main>
  );
}

function nextWord(previous: string): string {
  const choices = wordBank.filter((candidate) => candidate !== previous);
  return choices[Math.floor(Math.random() * choices.length)] ?? wordBank[0];
}
