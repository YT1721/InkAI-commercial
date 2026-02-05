'use client';

import React, { useState, useEffect } from 'react';
import { 
    X, Shield, Activity, Users, Database, Zap, 
    ArrowUpRight, ArrowDownRight, Search, Filter,
    CheckCircle, AlertCircle, Clock, Server, BarChart3
} from 'lucide-react';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'models' | 'users'>('overview');
    
    if (!isOpen) return null;

    const renderOverview = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: '今日生成任务', value: '1,284', change: '+12.5%', icon: Activity, color: 'text-cyan-400' },
                    { label: '活跃用户 (DAU)', value: '452', change: '+8.2%', icon: Users, color: 'text-purple-400' },
                    { label: 'API 成功率', value: '99.4%', change: '+0.1%', icon: CheckCircle, color: 'text-emerald-400' },
                    { label: '创意点数消耗', value: '85.2k', change: '+15.4%', icon: Zap, color: 'text-amber-400' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <stat.icon size={18} className={stat.color} />
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                                <ArrowUpRight size={10} /> {stat.change}
                            </span>
                        </div>
                        <div className="text-2xl font-black text-white">{stat.value}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Task Queue Preview */}
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">实时任务监控</h3>
                    <button className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300">查看全部</button>
                </div>
                <div className="p-0">
                    <table className="w-full text-[11px] text-left">
                        <thead>
                            <tr className="bg-white/[0.02] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="px-4 py-3">任务 ID</th>
                                <th className="px-4 py-3">用户</th>
                                <th className="px-4 py-3">类型</th>
                                <th className="px-4 py-3">状态</th>
                                <th className="px-4 py-3">耗时</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {[
                                { id: 'TASK-9281', user: 'user_291..', type: 'Video Gen', status: 'Running', time: '45s', statusColor: 'text-cyan-400' },
                                { id: 'TASK-9280', user: 'user_882..', type: 'Image Gen', status: 'Success', time: '12s', statusColor: 'text-emerald-400' },
                                { id: 'TASK-9279', user: 'user_102..', type: 'Audio Gen', status: 'Pending', time: '-', statusColor: 'text-amber-400' },
                                { id: 'TASK-9278', user: 'user_441..', type: 'Storyboard', status: 'Success', time: '8s', statusColor: 'text-emerald-400' }
                            ].map((task, i) => (
                                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-400">{task.id}</td>
                                    <td className="px-4 py-3 text-slate-300">{task.user}</td>
                                    <td className="px-4 py-3 text-slate-300">{task.type}</td>
                                    <td className={`px-4 py-3 font-bold ${task.statusColor}`}>{task.status}</td>
                                    <td className="px-4 py-3 text-slate-500">{task.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderModels = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Model Routing */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Server size={20} className="text-cyan-400" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">模型路由策略</h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { name: 'Gemini 3 Pro', status: 'Optimal', load: '42%', active: true },
                            { name: 'Gemini 3 Flash', status: 'High Load', load: '88%', active: true },
                            { name: 'Veo 3.1 Video', status: 'Optimal', load: '15%', active: true },
                            { name: 'Imagen 3 (Legacy)', status: 'Deprecated', load: '0%', active: false }
                        ].map((model, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white">{model.name}</span>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${model.active ? 'text-emerald-500' : 'text-slate-500'}`}>{model.status}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Load</span>
                                        <span className="text-xs font-mono text-slate-300">{model.load}</span>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${model.active ? 'bg-cyan-500/20' : 'bg-white/10'}`}>
                                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${model.active ? 'bg-cyan-400 right-1' : 'bg-slate-500 left-1'}`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* API Key Health */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Database size={20} className="text-purple-400" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">API 密钥健康度</h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { id: 'PROD-KEY-01', type: 'Primary', quota: '85%', health: 'Excellent' },
                            { id: 'PROD-KEY-02', type: 'Backup', quota: '12%', health: 'Excellent' },
                            { id: 'DEV-KEY-01', type: 'Sandbox', quota: '98%', health: 'Warning' }
                        ].map((key, i) => (
                            <div key={i} className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-slate-400">{key.id}</span>
                                    <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] font-black text-slate-500 uppercase">{key.type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{ width: key.quota }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-300">{key.quota}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Health</span>
                                    <span className={`text-[9px] font-bold uppercase ${key.health === 'Excellent' ? 'text-emerald-500' : 'text-amber-500'}`}>{key.health}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
            
            <div className="relative w-full max-w-6xl h-full bg-[#0c0c0e] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">商用管理后台 <span className="text-[10px] font-bold text-cyan-500 ml-2 bg-cyan-500/10 px-2 py-0.5 rounded-full">PROTOTYPE</span></h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Admin Management Dashboard</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Nav */}
                    <div className="w-48 border-r border-white/5 bg-black/20 p-4 space-y-2">
                        {[
                            { id: 'overview', label: '运行概览', icon: BarChart3 },
                            { id: 'tasks', label: '任务监控', icon: Activity },
                            { id: 'models', label: '模型管理', icon: Server },
                            { id: 'users', label: '用户管理', icon: Users }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'models' && renderModels()}
                        {activeTab === 'tasks' && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <Activity size={48} className="mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest">任务详情模块开发中...</p>
                            </div>
                        )}
                        {activeTab === 'users' && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <Users size={48} className="mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest">用户管理模块开发中...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-white/5 bg-black/40 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 系统在线</div>
                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> 区域: 华北-北京</div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-600">InkAI v1.2.0-commercial-beta</div>
                </div>
            </div>
        </div>
    );
};
