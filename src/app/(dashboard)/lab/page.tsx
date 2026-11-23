"use client";

import { useState } from "react";
import { PendulumSimulation } from "@/components/lab/pendulum-simulation";
import { ProjectileSimulation } from "@/components/lab/projectile-simulation";
import { SensorFusionSimulation } from "@/components/lab/sensor-fusion-simulation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import type { PendulumParams, ProjectileParams, SensorFusionParams, SimulationType } from "@/lib/lab/types";

// 鉴权与 force-dynamic 由 (dashboard)/layout.tsx 统一保证。
export default function LabPage() {
  const [activeTab, setActiveTab] = useState<SimulationType>("pendulum");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "你好！我是原理实验室AI助手，我会结合当前仿真参数为你讲解物理现象。你可以提问关于当前实验的问题，我会结合物理公式为你解答。" }
  ]);
  const [loading, setLoading] = useState(false);

  // 默认参数
  const [pendulumParams, setPendulumParams] = useState<PendulumParams>({
    gravity: 9.8,
    length: 1,
    mass: 1,
    angle: 45,
    damping: 0.05,
  });

  const [projectileParams, setProjectileParams] = useState<ProjectileParams>({
    gravity: 9.8,
    initialVelocity: 20,
    angle: 45,
    height: 1,
    airResistance: 0.01,
  });

  const [sensorParams, setSensorParams] = useState<SensorFusionParams>({
    translationOffset: 0,
    rotationOffset: 0,
    pointCloudDensity: 5,
    targetDistance: 10,
    targetSize: 1,
  });

  const tabs = [
    { id: "pendulum", label: "单摆运动" },
    { id: "projectile", label: "抛体运动" },
    { id: "sensor", label: "多传感器融合" },
  ];

  // 构建参数上下文
  function getParamsContext() {
    if (activeTab === "pendulum") {
      return `当前单摆实验参数：重力加速度${pendulumParams.gravity}m/s²，摆长${pendulumParams.length}m，摆球质量${pendulumParams.mass}kg，初始角度${pendulumParams.angle}°，阻尼系数${pendulumParams.damping}。`;
    } else if (activeTab === "projectile") {
      return `当前抛体运动实验参数：重力加速度${projectileParams.gravity}m/s²，初速度${projectileParams.initialVelocity}m/s，发射角度${projectileParams.angle}°，初始高度${projectileParams.height}m，空气阻力系数${projectileParams.airResistance}。`;
    } else {
      return `当前多传感器融合实验参数：平移偏差${sensorParams.translationOffset}mm，旋转偏差${sensorParams.rotationOffset}°，点云密度${sensorParams.pointCloudDensity}，目标距离${sensorParams.targetDistance}m，目标大小${sensorParams.targetSize}m。`;
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userMessage = question.trim();
    setQuestion("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const context = getParamsContext();
      const systemPrompt = `你是融研AI原理实验室助手，精通物理原理与多传感器标定技术。请结合当前实验参数：${context}，用户问题：${userMessage}。请用通俗易懂的语言，结合相关物理公式讲解当前现象，回复控制在300字以内。`;

      // 调用通用AI接口
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: systemPrompt }]
        })
      });

      if (!response.ok) throw new Error("请求失败");

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response || "抱歉，我暂时无法回答这个问题，请稍后再试。" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "请求失败，请检查网络连接后重试。" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">原理实验室</h1>
        <p className="text-muted-foreground">
          交互仿真实验 + AI原理讲解：经典物理仿真、多传感器融合感知仿真。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Tab栏 */}
          <div className="flex items-center gap-2 mb-6 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SimulationType)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 仿真内容 */}
          {activeTab === "pendulum" && (
            <PendulumSimulation params={pendulumParams} onParamsChange={(newParams) => setPendulumParams(prev => ({ ...prev, ...newParams }))} />
          )}
          {activeTab === "projectile" && (
            <ProjectileSimulation params={projectileParams} onParamsChange={(newParams) => setProjectileParams(prev => ({ ...prev, ...newParams }))} />
          )}
          {activeTab === "sensor" && (
            <SensorFusionSimulation params={sensorParams} onParamsChange={(newParams) => setSensorParams(prev => ({ ...prev, ...newParams }))} />
          )}
        </div>

        {/* 右侧AI问答框 */}
        <div className="border rounded-lg bg-card overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b">
            <h3 className="font-medium">AI 现象解读</h3>
            <p className="text-xs text-muted-foreground mt-1">结合当前参数解答实验问题</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                  <p className="text-sm">思考中...</p>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleAsk} className="p-4 border-t flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入你的问题..."
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
