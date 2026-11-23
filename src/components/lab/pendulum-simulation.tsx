"use client";

import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { PendulumParams } from "@/lib/lab/types";

interface PendulumSimulationProps {
  params: PendulumParams;
  onParamsChange: (params: Partial<PendulumParams>) => void;
}

export function PendulumSimulation({ params, onParamsChange }: PendulumSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [running, setRunning] = useState(true);
  const stateRef = useRef({
    angle: (params.angle * Math.PI) / 180,
    angularVelocity: 0,
    angularAcceleration: 0,
    time: 0,
    trajectory: [] as { x: number; y: number }[],
  });

  // 重置仿真
  function resetSimulation() {
    stateRef.current = {
      angle: (params.angle * Math.PI) / 180,
      angularVelocity: 0,
      angularAcceleration: 0,
      time: 0,
      trajectory: [],
    };
  }

  // 动画循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const pivotX = width / 2;
    const pivotY = 100;
    const scale = 100; // 像素/米
    const dt = 0.016; // 16ms 每帧 ~60fps

    function animate() {
      if (!running) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      if (!ctx) return;

      // 计算运动学
      const { gravity, length, damping } = params;
      const state = stateRef.current;

      // 角加速度 α = -g/L * sinθ - damping * ω
      state.angularAcceleration = -(gravity / length) * Math.sin(state.angle) - damping * state.angularVelocity;
      // 角速度 ω += α * dt
      state.angularVelocity += state.angularAcceleration * dt;
      // 角度 θ += ω * dt
      state.angle += state.angularVelocity * dt;
      state.time += dt;

      // 计算摆球位置
      const ballX = pivotX + length * scale * Math.sin(state.angle);
      const ballY = pivotY + length * scale * Math.cos(state.angle);

      // 记录轨迹
      if (state.trajectory.length < 500) {
        state.trajectory.push({ x: ballX, y: ballY });
      } else {
        state.trajectory.shift();
        state.trajectory.push({ x: ballX, y: ballY });
      }

      // 清空画布
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // 绘制轨迹
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      state.trajectory.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // 绘制摆线
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(ballX, ballY);
      ctx.stroke();

      // 绘制支点
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
      ctx.fill();

      // 绘制摆球
      const ballRadius = params.mass * 5 + 10;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制信息
      ctx.fillStyle = "#1e293b";
      ctx.font = "14px sans-serif";
      ctx.fillText(`角度: ${((state.angle * 180) / Math.PI).toFixed(1)}°`, 20, 30);
      ctx.fillText(`角速度: ${state.angularVelocity.toFixed(2)} rad/s`, 20, 55);
      ctx.fillText(`时间: ${state.time.toFixed(1)} s`, 20, 80);

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [params, running]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="secondary" size="sm" onClick={() => setRunning(!running)}>
          {running ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {running ? "暂停" : "继续"}
        </Button>
        <Button variant="secondary" size="sm" onClick={resetSimulation}>
          <RotateCcw className="w-4 h-4 mr-2" />
          重置
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="border rounded-lg bg-slate-50 w-full"
      />

      <div className="space-y-4 p-4 border rounded-lg bg-card">
        <div>
          <label className="text-sm font-medium mb-2 block">
            重力加速度: {params.gravity} m/s²
          </label>
          <Slider
            value={[params.gravity]}
            min={1}
            max={20}
            step={0.1}
            onValueChange={([v]) => onParamsChange({ gravity: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            摆长: {params.length} m
          </label>
          <Slider
            value={[params.length]}
            min={0.5}
            max={3}
            step={0.1}
            onValueChange={([v]) => onParamsChange({ length: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            摆球质量: {params.mass} kg
          </label>
          <Slider
            value={[params.mass]}
            min={0.1}
            max={5}
            step={0.1}
            onValueChange={([v]) => onParamsChange({ mass: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            初始角度: {params.angle} °
          </label>
          <Slider
            value={[params.angle]}
            min={-90}
            max={90}
            step={1}
            onValueChange={([v]) => {
              onParamsChange({ angle: v });
              resetSimulation();
            }}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            阻尼系数: {params.damping.toFixed(2)}
          </label>
          <Slider
            value={[params.damping]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([v]) => onParamsChange({ damping: v })}
          />
        </div>
      </div>
    </div>
  );
}
