import type { ObjectId } from "mongodb";
import type { AnalysisInput, AnalysisOutput } from "./schemas";

export type SavedAnalysisDoc = {
  _id: ObjectId;
  createdAt: Date;
  input: AnalysisInput;
  output: AnalysisOutput;
};
