"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import {
  listJobApplications,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
} from "@/lib/career/client-api";
import type { JobApplication, JobStatus } from "@/lib/career/types";

const STATUS_CONFIG: { value: JobStatus; label: string; color: string }[] = [
  { value: "pending", label: "待投递", color: "bg-gray-100 border-gray-300" },
  { value: "applied", label: "已投递", color: "bg-blue-50 border-blue-300" },
  { value: "written_test", label: "笔试", color: "bg-purple-50 border-purple-300" },
  { value: "interview", label: "面试", color: "bg-yellow-50 border-yellow-300" },
  { value: "offer", label: "Offer", color: "bg-green-50 border-green-300" },
  { value: "rejected", label: "已挂", color: "bg-red-50 border-red-300" },
];

export function KanbanTab() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [formData, setFormData] = useState({
    company: "",
    position: "",
    status: "pending" as JobStatus,
    interviewTime: "",
    salary: "",
    notes: "",
  });

  // 加载求职记录
  async function loadApplications() {
    setLoading(true);
    try {
      const data = await listJobApplications();
      setApplications(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "加载失败，请刷新页面重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  // 打开添加弹窗
  function openAddModal() {
    setEditingApp(null);
    setFormData({
      company: "",
      position: "",
      status: "pending",
      interviewTime: "",
      salary: "",
      notes: "",
    });
    setShowAddModal(true);
  }

  // 打开编辑弹窗
  function openEditModal(app: JobApplication) {
    setEditingApp(app);
    setFormData({
      company: app.company,
      position: app.position,
      status: app.status,
      interviewTime: app.interviewTime?.slice(0, 16) || "",
      salary: app.salary || "",
      notes: app.notes || "",
    });
    setShowAddModal(true);
  }

  // 提交表单
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.company.trim() || !formData.position.trim()) {
      alert("请填写公司名称和岗位名称");
      return;
    }

    try {
      if (editingApp) {
        await updateJobApplication(editingApp.id, {
          ...formData,
          interviewTime: formData.interviewTime || null,
          salary: formData.salary || null,
          notes: formData.notes || null,
        });
      } else {
        await createJobApplication({
          ...formData,
          interviewTime: formData.interviewTime || undefined,
          salary: formData.salary || undefined,
          notes: formData.notes || undefined,
        });
      }
      setShowAddModal(false);
      await loadApplications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败，请稍后重试");
    }
  }

  // 删除记录
  async function handleDelete(id: string) {
    if (!confirm("确定要删除这条记录吗？删除后无法恢复。")) return;
    try {
      await deleteJobApplication(id);
      await loadApplications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败，请稍后重试");
    }
  }

  // 移动到下一个状态
  async function moveToNextStatus(app: JobApplication) {
    const currentIndex = STATUS_CONFIG.findIndex((s) => s.value === app.status);
    if (currentIndex >= STATUS_CONFIG.length - 1) return;
    const nextStatus = STATUS_CONFIG[currentIndex + 1].value;
    try {
      await updateJobApplication(app.id, { status: nextStatus });
      await loadApplications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新失败，请稍后重试");
    }
  }

  // 按状态分组
  const groupedApplications = STATUS_CONFIG.map((status) => ({
    ...status,
    applications: applications.filter((app) => app.status === status.value),
  }));

  if (loading) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        加载中…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">求职进度看板</h3>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          添加记录
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {groupedApplications.map((group) => (
          <div key={group.value} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{group.label}</h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                {group.applications.length}
              </span>
            </div>
            <div
              className={`rounded-md p-3 min-h-[300px] space-y-2 ${group.color} border`}
            >
              {group.applications.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground pt-8">
                  暂无记录
                </p>
              ) : (
                group.applications.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-md bg-white p-3 shadow-sm border space-y-2 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-semibold text-sm">{app.company}</h5>
                        <p className="text-xs text-muted-foreground">{app.position}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(app);
                          }}
                          className="p-1 text-muted-foreground hover:text-primary"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(app.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive"
                          title="删除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {app.salary && (
                      <p className="text-xs text-green-600">💰 {app.salary}</p>
                    )}

                    {app.interviewTime && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(app.interviewTime), "MM-dd HH:mm")}
                      </div>
                    )}

                    {group.value !== "rejected" && group.value !== "offer" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveToNextStatus(app);
                        }}
                        className="w-full text-xs rounded bg-primary/10 text-primary py-1 hover:bg-primary/20"
                      >
                        推进到下一阶段
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="p-4 border-b">
              <h3 className="font-semibold">
                {editingApp ? "编辑求职记录" : "添加求职记录"}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">公司名称 *</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="请输入公司名称"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">岗位名称 *</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="请输入岗位名称"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">当前状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as JobStatus })}
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {STATUS_CONFIG.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">面试时间</label>
                <input
                  type="datetime-local"
                  value={formData.interviewTime}
                  onChange={(e) => setFormData({ ...formData, interviewTime: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">薪资范围</label>
                <input
                  type="text"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="如：15-20K*14"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="请输入备注信息"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-md border hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
