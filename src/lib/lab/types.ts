// 原理实验室类型定义

// 单摆运动参数
export interface PendulumParams {
  gravity: number; // 重力加速度 m/s²
  length: number; // 摆长 m
  mass: number; // 摆球质量 kg
  angle: number; // 初始角度 度
  damping: number; // 阻尼系数 0-1
}

// 抛体运动参数
export interface ProjectileParams {
  gravity: number; // 重力加速度 m/s²
  initialVelocity: number; // 初速度 m/s
  angle: number; // 发射角度 度
  height: number; // 初始高度 m
  airResistance: number; // 空气阻力系数 0-1
}

// 多传感器融合参数
export interface SensorFusionParams {
  translationOffset: number; // 外参平移偏差 mm
  rotationOffset: number; // 外参旋转偏差 度
  pointCloudDensity: number; // 点云密度 点/平方米
  targetDistance: number; // 目标距离 m
  targetSize: number; // 目标大小 m
}

// 仿真类型
export type SimulationType = "pendulum" | "projectile" | "sensor";

// 仿真状态
export interface SimulationState {
  running: boolean;
  time: number;
  paused: boolean;
}
