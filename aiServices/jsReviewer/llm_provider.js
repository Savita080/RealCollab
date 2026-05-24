import { ChatGroq } from "@langchain/groq";
import dotenv from "dotenv";

dotenv.config();

let _fastLlm = null;
let _smartLlm = null;

export function getFastLlm() {
  if (!_fastLlm) {
    _fastLlm = new ChatGroq({
      model: process.env.GROQ_FAST_MODEL || "llama-3.1-8b-instant",
      temperature: 0.0,
    });
  }
  return _fastLlm;
}

export function getSmartLlm() {
  if (!_smartLlm) {
    _smartLlm = new ChatGroq({
      model: process.env.GROQ_SMART_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.0,
    });
  }
  return _smartLlm;
}