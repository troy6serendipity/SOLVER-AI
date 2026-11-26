"use client";

import type { ExperimentLogDetail } from "../types";

interface ExperimentCompareProps {
  log1: ExperimentLogDetail;
  log2: ExperimentLogDetail;
}

export function ExperimentCompare({ log1, log2 }: ExperimentCompareProps) {
  // 比较两个值是否不同
  function isDifferent(v1: unknown, v2: unknown): boolean {
    if (v1 === null && v2 === null) return false;
    if (v1 === undefined && v2 === undefined) return false;
    if (typeof v1 === "object" && v1 !== null && typeof v2 === "object" && v2 !== null) {
      return JSON.stringify(v1) !== JSON.stringify(v2);
    }
    return v1 !== v2;
  }

  // 获取参数的所有键
  const paramKeys = new Set<string>();
  if (log1.parameters) Object.keys(log1.parameters).forEach(k => paramKeys.add(k));
  if (log2.parameters) Object.keys(log2.parameters).forEach(k => paramKeys.add(k));
  const allParamKeys = Array.from(paramKeys);

  const fields = [
    {
      label: "实验名称",
      value1: log1.title,
      value2: log2.title,
    },
    {
      label: "实验日期",
      value1: log1.experimentDate || "未填写",
      value2: log2.experimentDate || "未填写",
    },
    {
      label: "实验目的",
      value1: log1.purpose || "未填写",
      value2: log2.purpose || "未填写",
      multiline: true,
    },
    {
      label: "实验步骤",
      value1: log1.procedure || "未填写",
      value2: log2.procedure || "未填写",
      multiline: true,
    },
    {
      label: "实验现象",
      value1: log1.observations || "未填写",
      value2: log2.observations || "未填写",
      multiline: true,
    },
    {
      label: "实验结论",
      value1: log1.conclusion || "未填写",
      value2: log2.conclusion || "未填写",
      multiline: true,
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">实验记录对比</h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border px-4 py-2 text-left w-1/5">字段</th>
              <th className="border px-4 py-2 text-left w-2/5">
                {log1.title}（{log1.experimentDate || "无日期"}）
              </th>
              <th className="border px-4 py-2 text-left w-2/5">
                {log2.title}（{log2.experimentDate || "无日期"}）
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const diff = isDifferent(field.value1, field.value2);
              return (
                <tr key={index} className={diff ? "bg-red-50" : ""}>
                  <td className="border px-4 py-2 font-medium">{field.label}</td>
                  <td className={`border px-4 py-2 ${diff ? "font-medium text-red-700" : ""}`}>
                    {field.multiline ? (
                      <pre className="whitespace-pre-wrap text-sm">{field.value1}</pre>
                    ) : (
                      field.value1
                    )}
                  </td>
                  <td className={`border px-4 py-2 ${diff ? "font-medium text-red-700" : ""}`}>
                    {field.multiline ? (
                      <pre className="whitespace-pre-wrap text-sm">{field.value2}</pre>
                    ) : (
                      field.value2
                    )}
                  </td>
                </tr>
              );
            })}

            {/* 参数对比 */}
            {allParamKeys.length > 0 && (
              <>
                <tr className="bg-muted">
                  <td className="border px-4 py-2 font-medium" colSpan={3}>
                    实验参数对比
                  </td>
                </tr>
                {allParamKeys.map((key) => {
                  const v1 = log1.parameters?.[key] || "无";
                  const v2 = log2.parameters?.[key] || "无";
                  const diff = v1 !== v2;
                  return (
                    <tr key={key} className={diff ? "bg-red-50" : ""}>
                      <td className="border px-4 py-2 pl-8 font-medium">{key}</td>
                      <td className={`border px-4 py-2 ${diff ? "font-medium text-red-700" : ""}`}>
                        {v1}
                      </td>
                      <td className={`border px-4 py-2 ${diff ? "font-medium text-red-700" : ""}`}>
                        {v2}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
