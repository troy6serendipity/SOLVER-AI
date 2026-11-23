"use client";

import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { SensorFusionParams } from "@/lib/lab/types";

interface SensorFusionSimulationProps {
  params: SensorFusionParams;
  onParamsChange: (params: Partial<SensorFusionParams>) => void;
}

// 生成随机点云
function generatePointCloud(
  targetX: number,
  targetY: number,
  targetSize: number,
  density: number,
  distance: number
): { x: number; y: number; depth: number }[] {
  const points: { x: number; y: number; depth: number }[] = [];
  const pointCount = Math.floor(density * 100);
  
  // 生成目标点云
  for (let i = 0; i < pointCount * 0.7; i++) {
    const x = targetX + (Math.random() - 0.5) * targetSize;
    const y = targetY + (Math.random() - 0.5) * targetSize;
    const depth = distance + (Math.random() - 0.5) * 0.5;
    points.push({ x, y, depth });
  }

  // 生成背景点云
  for (let i = 0; i < pointCount * 0.3; i++) {
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 10;
    const depth = distance + Math.random() * 10;
    points.push({ x, y, depth });
  }

  return points;
}

export function SensorFusionSimulation({ params, onParamsChange }: SensorFusionSimulationProps) {
  const topCanvasRef = useRef<HTMLCanvasElement>(null); // 俯视图（点云）
  const frontCanvasRef = useRef<HTMLCanvasElement>(null); // 前视图（相机图像+点云投影）

  // 实时渲染
  useEffect(() => {
    const topCanvas = topCanvasRef.current;
    const frontCanvas = frontCanvasRef.current;
    if (!topCanvas || !frontCanvas) return;

    const topCtx = topCanvas.getContext("2d");
    const frontCtx = frontCanvas.getContext("2d");
    if (!topCtx || !frontCtx) return;

    const { translationOffset, rotationOffset, pointCloudDensity, targetDistance, targetSize } = params;
    const width = topCanvas.width;
    const height = topCanvas.height;
    const scale = 50; // 像素/米

    // 目标位置
    const targetX = 0;
    const targetY = targetDistance;

    // 生成点云
    const points = generatePointCloud(targetX, targetY, targetSize, pointCloudDensity, targetDistance);

    // ===== 绘制俯视图 =====
    topCtx.fillStyle = "#f8fafc";
    topCtx.fillRect(0, 0, width, height);

    // 坐标系
    const topOriginX = width / 2;
    const topOriginY = height / 2;

    // 网格
    topCtx.strokeStyle = "#e2e8f0";
    topCtx.lineWidth = 1;
    for (let x = -10; x <= 10; x++) {
      topCtx.beginPath();
      topCtx.moveTo(topOriginX + x * scale, 0);
      topCtx.lineTo(topOriginX + x * scale, height);
      topCtx.stroke();
    }
    for (let y = -10; y <= 10; y++) {
      topCtx.beginPath();
      topCtx.moveTo(0, topOriginY + y * scale);
      topCtx.lineTo(width, topOriginY + y * scale);
      topCtx.stroke();
    }

    // 传感器位置
    topCtx.fillStyle = "#22c55e";
    topCtx.beginPath();
    topCtx.arc(topOriginX, topOriginY, 10, 0, Math.PI * 2);
    topCtx.fill();
    topCtx.fillStyle = "#166534";
    topCtx.font = "12px sans-serif";
    topCtx.fillText("LiDAR + 相机", topOriginX + 15, topOriginY + 5);

    // 视场角
    topCtx.strokeStyle = "#22c55e";
    topCtx.lineWidth = 2;
    topCtx.beginPath();
    topCtx.moveTo(topOriginX, topOriginY);
    topCtx.lineTo(topOriginX + Math.tan(-Math.PI / 6) * height, 0);
    topCtx.moveTo(topOriginX, topOriginY);
    topCtx.lineTo(topOriginX + Math.tan(Math.PI / 6) * height, 0);
    topCtx.stroke();

    // 目标真实位置
    topCtx.fillStyle = "#ef4444";
    const targetTopX = topOriginX + targetX * scale;
    const targetTopY = topOriginY + targetY * scale;
    topCtx.fillRect(targetTopX - targetSize * scale / 2, targetTopY - targetSize * scale / 2, targetSize * scale, targetSize * scale);
    topCtx.strokeStyle = "#991b1b";
    topCtx.lineWidth = 2;
    topCtx.strokeRect(targetTopX - targetSize * scale / 2, targetTopY - targetSize * scale / 2, targetSize * scale, targetSize * scale);
    topCtx.fillStyle = "#991b1b";
    topCtx.fillText("真实目标位置", targetTopX + targetSize * scale / 2 + 10, targetTopY);

    // 点云绘制
    points.forEach(p => {
      const x = topOriginX + p.x * scale;
      const y = topOriginY + p.y * scale;
      const alpha = Math.max(0.2, 1 - p.depth / 20);
      topCtx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
      topCtx.beginPath();
      topCtx.arc(x, y, 2, 0, Math.PI * 2);
      topCtx.fill();
    });

    // ===== 绘制前视图 =====
    frontCtx.fillStyle = "#0f172a";
    frontCtx.fillRect(0, 0, width, height);

    // 相机图像坐标系
    const frontOriginX = width / 2;
    const frontOriginY = height / 2;
    const focalLength = 500; // 焦距

    // 相机图像中的目标框（真实位置）
    const targetImageX = frontOriginX + (targetX / targetDistance) * focalLength;
    const targetImageY = frontOriginY;
    const targetImageSize = (targetSize / targetDistance) * focalLength;

    frontCtx.strokeStyle = "#22c55e";
    frontCtx.lineWidth = 3;
    frontCtx.strokeRect(
      targetImageX - targetImageSize / 2,
      targetImageY - targetImageSize / 2,
      targetImageSize,
      targetImageSize
    );
    frontCtx.fillStyle = "#22c55e";
    frontCtx.font = "14px sans-serif";
    frontCtx.fillText("相机检测框", targetImageX + targetImageSize / 2 + 10, targetImageY);

    // 带偏差的点云投影
    const rotationRad = (rotationOffset * Math.PI) / 180;
    const translationM = translationOffset / 1000; // mm转m

    points.forEach(p => {
      // 应用外参偏差
      const rotatedX = p.x * Math.cos(rotationRad) - p.y * Math.sin(rotationRad) + translationM;
      const rotatedY = p.x * Math.sin(rotationRad) + p.y * Math.cos(rotationRad);

      // 投影到图像平面
      if (rotatedY <= 0) return;
      const imageX = frontOriginX + (rotatedX / rotatedY) * focalLength;
      const imageY = frontOriginY; // 简化为2D投影
      const alpha = Math.max(0.3, 1 - p.depth / 20);
      frontCtx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      frontCtx.beginPath();
      frontCtx.arc(imageX, imageY, 3, 0, Math.PI * 2);
      frontCtx.fill();
    });

    // 偏差标注
    frontCtx.strokeStyle = "#fbbf24";
    frontCtx.lineWidth = 2;
    frontCtx.setLineDash([5, 5]);
    const offsetX = (translationM / targetDistance) * focalLength + targetImageSize * Math.tan(rotationRad);
    frontCtx.strokeRect(
      targetImageX - targetImageSize / 2 + offsetX,
      targetImageY - targetImageSize / 2,
      targetImageSize,
      targetImageSize
    );
    frontCtx.fillStyle = "#fbbf24";
    frontCtx.fillText("点云投影目标框", targetImageX + targetImageSize / 2 + 10, targetImageY + 25);
    frontCtx.setLineDash([]);

    // 信息
    frontCtx.fillStyle = "#ffffff";
    frontCtx.font = "14px sans-serif";
    frontCtx.fillText(`平移偏差: ${translationOffset} mm`, 20, 30);
    frontCtx.fillText(`旋转偏差: ${rotationOffset} °`, 20, 55);
    frontCtx.fillText(`投影偏移: ${offsetX.toFixed(1)} 像素`, 20, 80);

  }, [params]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2 text-center">俯视图（LiDAR点云）</h3>
          <canvas
            ref={topCanvasRef}
            width={600}
            height={400}
            className="border rounded-lg bg-slate-50 w-full"
          />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2 text-center">前视图（相机图像 + 点云投影）</h3>
          <canvas
            ref={frontCanvasRef}
            width={600}
            height={400}
            className="border rounded-lg bg-slate-900 w-full"
          />
        </div>
      </div>

      <div className="space-y-4 p-4 border rounded-lg bg-card">
        <div>
          <label className="text-sm font-medium mb-2 block">
            外参平移偏差: {params.translationOffset} mm
          </label>
          <Slider
            value={[params.translationOffset]}
            min={-100}
            max={100}
            step={1}
            onValueChange={([v]) => onParamsChange({ translationOffset: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            外参旋转偏差: {params.rotationOffset} °
          </label>
          <Slider
            value={[params.rotationOffset]}
            min={-5}
            max={5}
            step={0.1}
            onValueChange={([v]) => onParamsChange({ rotationOffset: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            点云密度: {params.pointCloudDensity.toFixed(1)}
          </label>
          <Slider
            value={[params.pointCloudDensity]}
            min={1}
            max={10}
            step={0.1}
            onValueChange={([v]) => onParamsChange({ pointCloudDensity: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            目标距离: {params.targetDistance} m
          </label>
          <Slider
            value={[params.targetDistance]}
            min={2}
            max={20}
            step={0.1}
            onValueChange={([v]) => onParamsChange({ targetDistance: v })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            目标大小: {params.targetSize} m
          </label>
          <Slider
            value={[params.targetSize]}
            min={0.5}
            max={3}
            step={0.1}
            onValueChange={([v]) => onParamsChange({ targetSize: v })}
          />
        </div>
      </div>
    </div>
  );
}
