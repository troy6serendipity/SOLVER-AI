"use client";

import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { ProjectileParams } from "@/lib/lab/types";

interface ProjectileSimulationProps {
  params: ProjectileParams;
  onParamsChange: (params: Partial<ProjectileParams>) => void;
}

export function ProjectileSimulation({ params, onParamsChange }: ProjectileSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [running, setRunning] = useState(true);
  const stateRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    time: 0,
    trajectory: [] as { x: number; y: number }[],
  });

  // 重置仿真
  function resetSimulation() {
    const angleRad = (params.angle * Math.PI) / 180;
    stateRef.current = {
      x: 0,
      y: params.height,
      vx: params.initialVelocity * Math.cos(angleRad),
      vy: params.initialVelocity * Math.sin(angleRad),
      time: 0,
      trajectory: [],
    };
  }

  // 初始化
  useEffect(() => {
    resetSimulation();
  }, [params.initialVelocity, params.angle, params.height]);

  // 动画循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scale = 20; // 像素/米
    const originX = 50;
    const originY = height - 50;
    const dt = 0.016; // 16ms 每帧 ~60fps

    function animate() {
      if (!running) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      if (!ctx) return;

      const { gravity, airResistance } = params;
      const state = stateRef.current;

      // 检查是否落地
      if (state.y <= 0) {
        setRunning(false);
        return;
      }

      // 计算加速度
      const ax = -airResistance * state.vx * Math.abs(state.vx);
      const ay = -gravity - airResistance * state.vy * Math.abs(state.vy);

      // 更新速度
      state.vx += ax * dt;
      state.vy += ay * dt;

      // 更新位置
      state.x += state.vx * dt;
      state.y += state.vy * dt;
      state.time += dt;

      // 记录轨迹
      if (state.trajectory.length < 1000) {
        state.trajectory.push({ x: state.x, y: state.y });
      }

      // 清空画布
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // 绘制坐标轴
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(width - 20, originY); // X轴
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX, 20); // Y轴
      ctx.stroke();

      // 绘制网格
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(originX + x, originY);
        ctx.lineTo(originX + x, 0);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 100) {
        ctx.beginPath();
        ctx.moveTo(originX, originY - y);
        ctx.lineTo(width, originY - y);
        ctx.stroke();
      }

      // 绘制轨迹
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      state.trajectory.forEach((p, i) => {
        const canvasX = originX + p.x * scale;
        const canvasY = originY - p.y * scale;
        if (i === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      });
      ctx.stroke();

      // 绘制抛体
      const ballX = originX + state.x * scale;
      const ballY = originY - state.y * scale;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(ballX, ballY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制信息
      ctx.fillStyle = "#1e293b";
      ctx.font = "14px sans-serif";
      ctx.fillText(`位置: (${state.x.toFixed(1)}m, ${state.y.toFixed(1)}m)`, 20, 30);
      ctx.fillText(`速度: (${state.vx.toFixed(1)}m/s, ${state.vy.toFixed(1)}m/s)`, 20, 55);
      ctx.fillText(`时间: ${state.time.toFixed(1)} s`, 20, 80);
      ctx.fillText(`射程预估: ${((state.vx * state.time) + (state.vx * state.y / Math.abs(state.vy))).toFixed(1)} m`, 20, 105);

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
        <Button variant="secondary" size="sm" onClick={() => {
          resetSimulation();
          setRunning(true);
        }}>
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
            初速度: {params.initialVelocity} m/s
          </label>
          <Slider
            value={[params.initialVelocity]}
            min={5}
            max={50}
            step={1}
            onValueChange={([v]) => onParamsChange({ initialVelocity: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            发射角度: {params.angle} °
          </label>
          <Slider
            value={[params.angle]}
            min={0}
            max={90}
            step={1}
            onValueChange={([v]) => onParamsChange({ angle: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            初始高度: {params.height} m
          </label>
          <Slider
            value={[params.height]}
            min={0}
            max={20}
            step={0.1}
            onValueChange={([v]) => onParamsChange({ height: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            空气阻力系数: {params.airResistance.toFixed(3)}
          </label>
          <Slider
            value={[params.airResistance]}
            min={0}
            max={0.1}
            step={0.001}
            onValueChange={([v]) => onParamsChange({ airResistance: v })}
          />
        </div>
      </div>
    </div>
  );
}
