"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ExperimentLogDetail } from "../types";

interface ExperimentFormProps {
  initialData?: Partial<ExperimentLogDetail>;
  onSubmit: (data: Partial<ExperimentLogDetail>) => Promise<void>;
  submitText?: string;
  isLoading?: boolean;
}

export function ExperimentForm({
  initialData,
  onSubmit,
  submitText = "保存实验记录",
  isLoading = false,
}: ExperimentFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [experimentDate, setExperimentDate] = useState(
    initialData?.experimentDate || new Date().toISOString().split("T")[0]
  );
  const [purpose, setPurpose] = useState(initialData?.purpose || "");
  const [procedure, setProcedure] = useState(initialData?.procedure || "");
  const [parameters, setParameters] = useState<Array<{ key: string; value: string }>>(
    initialData?.parameters
      ? Object.entries(initialData.parameters).map(([key, value]) => ({ key, value }))
      : [{ key: "", value: "" }]
  );
  const [observations, setObservations] = useState(initialData?.observations || "");
  const [conclusion, setConclusion] = useState(initialData?.conclusion || "");
  const [error, setError] = useState<string | null>(null);

  // 添加参数行
  function addParameter() {
    setParameters([...parameters, { key: "", value: "" }]);
  }

  // 删除参数行
  function removeParameter(index: number) {
    if (parameters.length <= 1) return;
    setParameters(parameters.filter((_, i) => i !== index));
  }

  // 更新参数
  function updateParameter(index: number, field: "key" | "value", value: string) {
    const newParams = [...parameters];
    newParams[index][field] = value;
    setParameters(newParams);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("实验名称不能为空");
      return;
    }

    try {
      // 转换参数为对象
      const paramObj: Record<string, string> = {};
      for (const param of parameters) {
        if (param.key.trim() && param.value.trim()) {
          paramObj[param.key.trim()] = param.value.trim();
        }
      }

      await onSubmit({
        title: title.trim(),
        experimentDate: experimentDate || undefined,
        purpose: purpose.trim() || undefined,
        procedure: procedure.trim() || undefined,
        parameters: Object.keys(paramObj).length > 0 ? paramObj : undefined,
        observations: observations.trim() || undefined,
        conclusion: conclusion.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">实验名称 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="请输入实验名称"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">实验日期</label>
          <input
            type="date"
            value={experimentDate}
            onChange={(e) => setExperimentDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">实验目的</label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="w-full rounded-md border px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="请输入实验目的"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">实验参数</label>
          <button
            type="button"
            onClick={addParameter}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4" /> 添加参数
          </button>
        </div>
        <div className="space-y-2">
          {parameters.map((param, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                value={param.key}
                onChange={(e) => updateParameter(index, "key", e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="参数名"
                disabled={isLoading}
              />
              <span className="text-sm text-muted-foreground">=</span>
              <input
                type="text"
                value={param.value}
                onChange={(e) => updateParameter(index, "value", e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="参数值"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => removeParameter(index)}
                className="p-2 text-muted-foreground hover:text-destructive"
                disabled={isLoading || parameters.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">实验步骤</label>
        <textarea
          value={procedure}
          onChange={(e) => setProcedure(e.target.value)}
          className="w-full rounded-md border px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="请输入实验步骤，可分点描述"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">实验现象与记录</label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="w-full rounded-md border px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="请记录实验过程中观察到的现象和数据"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">实验结论</label>
        <textarea
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          className="w-full rounded-md border px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="请总结本次实验的结论"
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "保存中…" : submitText}
        </button>
      </div>
    </form>
  );
}
