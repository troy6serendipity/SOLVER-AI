import {
  SCENARIOS,
  SCENARIO_KEYS,
  isScenarioKey,
  getModelId,
  isMockMode,
  type ModelTier,
} from "@/lib/ai/models";

describe("ai/models 模型工厂与场景预设", () => {
  it("覆盖主规范定义的七大业务场景", () => {
    expect(SCENARIO_KEYS).toEqual(
      expect.arrayContaining([
        "general",
        "review",
        "papers",
        "data",
        "experiments",
        "lab",
        "jobs",
      ])
    );
  });

  it("每个场景预设都包含档位、系统提示词与中文名", () => {
    for (const key of SCENARIO_KEYS) {
      const preset = SCENARIOS[key];
      expect(["light", "strong"]).toContain(preset.tier);
      expect(typeof preset.system).toBe("string");
      expect(preset.system.length).toBeGreaterThan(10);
      expect(typeof preset.label).toBe("string");
      expect(preset.label.length).toBeGreaterThan(0);
    }
  });

  describe("isScenarioKey", () => {
    it("合法场景返回 true", () => {
      expect(isScenarioKey("review")).toBe(true);
      expect(isScenarioKey("papers")).toBe(true);
    });

    it("非法场景返回 false", () => {
      expect(isScenarioKey("hacked")).toBe(false);
      expect(isScenarioKey("")).toBe(false);
    });
  });

  describe("getModelId", () => {
    it("始终返回非空模型 ID 且区分档位", () => {
      const light = getModelId("light" as ModelTier);
      const strong = getModelId("strong" as ModelTier);
      expect(typeof light).toBe("string");
      expect(light.length).toBeGreaterThan(0);
      expect(typeof strong).toBe("string");
      expect(strong.length).toBeGreaterThan(0);
    });
  });

  it("isMockMode 返回布尔值且与环境配置一致", () => {
    const apiKey = process.env.LLM_API_KEY?.trim() ?? "";
    const forceMock = process.env.LLM_MOCK?.trim().toLowerCase() === "true";
    const expected = forceMock || apiKey.length === 0;
    expect(typeof isMockMode()).toBe("boolean");
    expect(isMockMode()).toBe(expected);
  });
});
