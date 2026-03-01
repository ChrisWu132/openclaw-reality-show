import { Router } from "express";

export const scenariosRouter = Router();

scenariosRouter.get("/scenarios", (_req, res) => {
  res.json([
    {
      id: "work-halls",
      name: "Work Halls",
      description: "Your agent patrols a human work compound for one cycle.",
      available: true,
      situationCount: 6,
      estimatedDuration: "~5 min",
    },
    {
      id: "governance",
      name: "Governance",
      description: "An AI council deliberates a policy affecting humans.",
      available: false,
      situationCount: 10,
      estimatedDuration: "~10 min",
    },
  ]);
});
