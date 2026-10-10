
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CalendarDays, 
  Package, 
  PieChart as PieChartIcon,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Layers,
  Archive,
  Calendar,
  Minus,
  Plus,
  BarChart as BarChartIcon,
  Users,
  Coins,
  History
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLORS = ['#4D7C0F', '#84CC16', '#A3E635', '#BEF264', '#D9F99D', '#ECFCCB'];

export default function ReportsPage() {
  const { 
    products, 
    movements, 
    expenses, 
    isAdmin,
    isSuperAdmin,
    isLoading,
    initialCapital,
    convertQuantity
  } = useAgriStock();
  
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState<'all' | '30days' | '7days'>('all');
  
  const [minimized, setMinimized] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && !isLoading && user && !isAdmin && !isSuperAdmin) {
      router.push('/');
    }
  }, [user, isUserLoading, isLoading, router, isAdmin, isSuperAdmin]);

  const toggleMinimize = (id: string) => {
    setMinimized(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    let movementsList = movements || [];
    let expensesList = expenses || [];

    if (period === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      movementsList = movementsList.filter(m => m.movementDateTime && new Date(m.movementDateTime) >= thirtyDaysAgo);
      expensesList = expensesList.filter(e => e.date && new Date(e.date) >= thirtyDaysAgo);
    } else if (period === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      movementsList = movementsList.filter(m => m.movementDateTime && new Date(m.movementDateTime) >= sevenDaysAgo);
      expensesList = expensesList.filter(e => e.date && new Date(e.date) >= sevenDaysAgo);
    }

    const income = movementsList.filter(m => m.type === 'venta').reduce((sum, m) => sum + (m.totalValue || 0), 0);
    const expensesTotal = expensesList.reduce((sum, e) => sum + (e.total || 0), 0);
    
    // Calcular Costo de Mercancía Vendida (COGS) para el periodo filtrado
    const cogsTotal = movementsList
      .filter(m => m.type === 'venta')
      .reduce((sum, m) => {
        const prod = products.find(p => p.id === m.productId);
        if (!prod) return sum;
        const qtyInBase = convertQuantity(m.quantity || 0, m.unit, prod.mainUnit);
        const unitCost = (prod.costPrice || 0) + (prod.transportPricePerBundle || 0);
        return sum + (qtyInBase * unitCost);
      }, 0);
    
    return { movementsList, expensesList, income, expensesTotal, cogsTotal };
  }, [movements, expenses, period, products, convertQuantity]);

  // Datos para Gráfico de Ventas Mensuales
  const salesByMonthData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      if (!m.movementDateTime) return;
      const date = new Date(m.movementDateTime);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const key = `${year}-${(monthIdx + 1).toString().padStart(2, '0')}`;
      
      dataMap[key] = (dataMap[key] || 0) + (m.totalValue || 0);
    });

    return Object.entries(dataMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const [year, monthStr] = key.split('-');
        return {
          month: `${months[parseInt(monthStr) - 1]} ${year}`,
          ventas: value
        };
      });
  }, [filteredData]);

  // Gráfico: Utilidad Mensual por Ventas (Sin Gastos por solicitud del usuario)
  const profitByMonthData = useMemo(() => {
    const dataMap: Record<string, { income: number, cost: number }> = {};
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Ingresos y Costos de Venta
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      if (!m.movementDateTime) return;
      const date = new Date(m.movementDateTime);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!dataMap[key]) dataMap[key] = { income: 0, cost: 0 };
      
      dataMap[key].income += (m.totalValue || 0);
      
      const prod = products.find(p => p.id === m.productId);
      if (prod) {
        const qtyInBase = convertQuantity(m.quantity || 0, m.unit, prod.mainUnit);
        const unitCost = (prod.costPrice || 0) + (prod.transportPricePerBundle || 0);
        dataMap[key].cost += (qtyInBase * unitCost);
      }
    });

    return Object.entries(dataMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => {
        const [year, monthStr] = key.split('-');
        const profit = data.income - data.cost;
        return {
          month: `${months[parseInt(monthStr) - 1]} ${year}`,
          utilidad: Number(profit.toFixed(2))
        };
      });
  }, [filteredData, products, convertQuantity]);

  // Datos para Gráfico de Bultos Mensuales
  const bundlesByMonthData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      if (!m.movementDateTime) return;
      const date = new Date(m.movementDateTime);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const key = `${year}-${(monthIdx + 1).toString().padStart(2, '0')}`;
      
      const bundles = convertQuantity(m.quantity || 0, m.unit, 'bultos');
      dataMap[key] = (dataMap[key] || 0) + bundles;
    });

    return Object.entries(dataMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const [year, monthStr] = key.split('-');
        return {
          month: `${months[parseInt(monthStr) - 1]} ${year}`,
          bultos: Number(value.toFixed(1))
        };
      });
  }, [filteredData, convertQuantity]);

  const chartTimelineData = useMemo(() => {
    const dataMap: Record<string, { iso: string, date: string, ingresos: number, gastos: number }> = {};
    
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      if (!m.movementDateTime) return;
      const dateObj = new Date(m.movementDateTime);
      if (isNaN(dateObj.getTime())) return;
      
      const isoKey = dateObj.toISOString().split('T')[0];
      const d = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!dataMap[isoKey]) dataMap[isoKey] = { iso: isoKey, date: d, ingresos: 0, gastos: 0 };
      dataMap[isoKey].ingresos += (m.totalValue || 0);
    });

    filteredData.expensesList.forEach(e => {
      if (!e.date) return;
      const dateObj = new Date(e.date);
      if (isNaN(dateObj.getTime())) return;

      const isoKey = dateObj.toISOString().split('T')[0];
      const d = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!dataMap[isoKey]) dataMap[isoKey] = { iso: isoKey, date: d, ingresos: 0, gastos: 0 };
      dataMap[isoKey].gastos += (e.total || 0);
    });

    return Object.values(dataMap).sort((a, b) => a.iso.localeCompare(b.iso));
  }, [filteredData]);

  const topProductsData = useMemo(() => {
    const counts: Record<string, { value: number, profit: number, bundles: number, stock: number, unit: string }> = {};
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      const prod = products.find(p => p.id === m.productId);
      const name = prod?.name || 'Desconocido';
      
      if (!counts[name]) {
        counts[name] = { 
          value: 0, 
          profit: 0,
          bundles: 0, 
          stock: prod?.stock || 0, 
          unit: prod?.mainUnit || '' 
        };
      }
      
      const income = (m.totalValue || 0);
      counts[name].value += income;
      
      if (prod) {
        const qtyInBase = convertQuantity(m.quantity || 0, m.unit, prod.mainUnit);
        const unitCost = (prod.costPrice || 0) + (prod.transportPricePerBundle || 0);
        const costOfSale = qtyInBase * unitCost;
        counts[name].profit += (income - costOfSale);
        counts[name].bundles += convertQuantity(m.quantity || 0, m.unit, 'bultos');
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ 
        name, 
        value: data.value,
        profit: Number(data.profit.toFixed(2)),
        bundles: Number(data.bundles.toFixed(1)),
        stock: data.stock,
        unit: data.unit
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, products, convertQuantity]);

  const topProfitProductsData = useMemo(() => {
    return [...topProductsData].sort((a, b) => b.profit - a.profit).slice(0, 15);
  }, [topProductsData]);

  const topCustomersData = useMemo(() => {
    const counts: Record<string, { value: number, bundles: number }> = {};
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      const name = m.customerName || 'Venta de Mostrador';
      const phone = m.customerPhone || '';
      const key = `${name}${phone ? ` (${phone})` : ''}`;
      
      if (!counts[key]) {
        counts[key] = { value: 0, bundles: 0 };
      }
      
      counts[key].value += (m.totalValue || 0);
      
      const prod = products.find(p => p.id === m.productId);
      if (prod) {
        counts[key].bundles += convertQuantity(m.quantity || 0, m.unit, 'bultos');
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ 
        name, 
        value: data.value,
        bundles: Number(data.bundles.toFixed(1))
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData, products, convertQuantity]);

  if (isUserLoading || isLoading || !mounted) return <LoadingScreen />;
  if (!user || (!isAdmin && !isSuperAdmin)) return null;

  // Nuevo cálculo de balance global para reportes: (Ingresos + Capital) - (Costo Mercancía + Gastos)
  const netProfit = (initialCapital || 0) + (filteredData.income || 0) - (filteredData.cogsTotal || 0) - (filteredData.expensesTotal || 0);
  const dynamicIncomeChartHeight = Math.max(350, topProductsData.length * 40);
  const dynamicProfitChartHeight = Math.max(350, topProfitProductsData.length * 40);
  const dynamicCustomersChartHeight = Math.max(350, topCustomersData.length * 45);

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">Análisis de Reportes</h1>
              <Badge variant="outline" className="text-accent border-accent gap-1">
                <ShieldCheck className="w-3 h-3" /> Solo Admin
              </Badge>
            </div>
            <p className="text-muted-foreground">Estadísticas financieras y rendimiento de inventario</p>
          </div>
        </div>
        
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-[180px] bg-white">
            <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Histórico Completo</SelectItem>
            <SelectItem value="30days">Últimos 30 días</SelectItem>
            <SelectItem value="7days">Últimos 7 días</SelectItem>
          </SelectContent>
        </Select>
      </header>

      {/* Tarjetas de Resumen */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/20 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest text-primary">Ingresos Operativos</CardDescription>
            <CardTitle className="text-2xl font-black text-foreground flex items-center justify-between">
              ${(filteredData.income || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <ArrowUpRight className="w-5 h-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground italic">Ventas brutas en el periodo</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest text-destructive">Egresos Totales</CardDescription>
            <CardTitle className="text-2xl font-black text-foreground flex items-center justify-between">
              ${(filteredData.expensesTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <ArrowDownRight className="w-5 h-5 text-destructive" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground italic">Gastos operacionales registrados</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest text-accent">Balance Neto Global</CardDescription>
            <CardTitle className={cn("text-2xl font-black flex items-center justify-between", netProfit >= 0 ? "text-green-600" : "text-destructive")}>
              ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <PiggyBank className="w-5 h-5 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground italic">Patrimonio (Ingresos + Cap - Costos - Gastos)</p>
          </CardContent>
        </Card>

        <Card className="border-muted bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Productos Activos</CardDescription>
            <CardTitle className="text-2xl font-black text-foreground flex items-center justify-between">
              {products.length}
              <Package className="w-5 h-5 text-muted-foreground opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground italic">Items registrados en catálogo</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* REPORTE: UTILIDAD MENSUAL POR VENTAS */}
        <Card className="shadow-sm border-green-200 bg-green-50/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                <PiggyBank className="w-5 h-5" />
                Utilidades de Ventas por Mes
              </CardTitle>
              {!minimized['monthlyProfit'] && <CardDescription>Beneficio bruto (Ventas - Costos de Mercancía) por mes</CardDescription>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => toggleMinimize('monthlyProfit')}>
              {minimized['monthlyProfit'] ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {!minimized['monthlyProfit'] && (
            <CardContent className="h-[350px] animate-in fade-in zoom-in-95 duration-300">
              {profitByMonthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitByMonthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `$${val / 1000}k`} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [`$${val.toLocaleString()}`, 'Utilidad Bruta']}
                    />
                    <Bar dataKey="utilidad" fill="#15803d" radius={[6, 6, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic text-sm">No hay datos suficientes para calcular utilidades mensuales.</div>
              )}
            </CardContent>
          )}
        </Card>

        {/* REPORTE: VENTAS POR MES */}
        <Card className="shadow-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Calendar className="w-5 h-5" />
                Ventas Totales por Mes
              </CardTitle>
              {!minimized['monthly'] && <CardDescription>Consolidado histórico de ingresos mensuales</CardDescription>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => toggleMinimize('monthly')}>
              {minimized['monthly'] ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {!minimized['monthly'] && (
            <CardContent className="h-[350px] animate-in fade-in zoom-in-95 duration-300">
              {salesByMonthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByMonthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `$${val / 1000}k`} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [`$${val.toLocaleString()}`, 'Ingresos']}
                    />
                    <Bar dataKey="ventas" fill="#4D7C0F" radius={[6, 6, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic text-sm">No hay datos suficientes para generar este reporte.</div>
              )}
            </CardContent>
          )}
        </Card>

        {/* REPORTE: BULTOS POR MES */}
        <Card className="shadow-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Archive className="w-5 h-5" />
                Volumen de Bultos por Mes
              </CardTitle>
              {!minimized['monthlyBundles'] && <CardDescription>Cantidad total de bultos (Equiv. 40kg) vendidos por mes</CardDescription>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => toggleMinimize('monthlyBundles')}>
              {minimized['monthlyBundles'] ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {!minimized['monthlyBundles'] && (
            <CardContent className="h-[350px] animate-in fade-in zoom-in-95 duration-300">
              {bundlesByMonthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bundlesByMonthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [`${val.toLocaleString()} Bultos`, 'Volumen']}
                    />
                    <Bar dataKey="bultos" fill="#4D7C0F" radius={[6, 6, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic text-sm">No hay datos suficientes para generar este reporte.</div>
              )}
            </CardContent>
          )}
        </Card>

        {/* REPORTE: VENTAS POR DÍA */}
        <Card className="shadow-sm border-accent/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2 text-accent">
                <BarChartIcon className="w-5 h-5" />
                Ventas Totales por Día
              </CardTitle>
              {!minimized['daily'] && <CardDescription>Distribución de ingresos en el periodo seleccionado</CardDescription>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => toggleMinimize('daily')}>
              {minimized['daily'] ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {!minimized['daily'] && (
            <CardContent className="h-[350px] animate-in fade-in zoom-in-95 duration-300">
              {chartTimelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `$${val / 1000}k`} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [`$${val.toLocaleString()}`, 'Ventas']}
                    />
                    <Bar dataKey="ingresos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic text-sm">No hay ventas en este periodo.</div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Gráfico de Tendencias */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Ingresos vs Gastos
              </CardTitle>
              {!minimized['trends'] && <CardDescription>Flujo de caja comparativo diario</CardDescription>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => toggleMinimize('trends')}>
              {minimized['trends'] ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {!minimized['trends'] && (
            <CardContent className="h-[350px] animate-in fade-in zoom-in-95 duration-300">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTimelineData}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4D7C0F" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4D7C0F" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [`$${val.toLocaleString()}`, '']}
                  />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="ingresos" stroke="#4D7C0F" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                  <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          )}
        </Card>

        {/* Gráfico de Productos Estrella por Recaudo */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Ingresos por Producto ($)
              </CardTitle>
              {!minimized['topIncome'] && <CardDescription>Ventas acumuladas brutas por cada ítem</CardDescription>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => toggleMinimize('topIncome')}>
              {minimized['topIncome'] ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {!minimized['topIncome'] && (
            <CardContent className="overflow-auto animate-in fade-in zoom-in-95 duration-300" style={{ height: dynamicIncomeChartHeight + 'px' }}>
              {topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold' }} 
                      width={150} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string, props: any) => {
                        const bundles = props.payload.bundles;
                        return [
                          `$${value.toLocaleString()} (${bundles} bultos vend.)`,
                          'Ingreso Bruto'
                        ];
                      }}
                    />
                    <Bar dataKey="value" fill="#4D7C0F" radius={[0, 4, 4, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                  No hay ventas registradas en este periodo.
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* REPORTE: UTILIDAD GANADA POR PRODUCTO */}
        <Card className="shadow-sm lg:col-span-2 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2 text-accent">
                <Coins className="w-5 h-5" />
                Utilidad Ganada por Producto ($)
              </CardTitle>
              {!minimized['topProfit'] && <CardDescription>Ganancia real neta (Ingreso - Costo + Flete) por ítem</CardDescription>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => toggleMinimize('topProfit')}>
              {minimized['topProfit'] ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {!minimized['topProfit'] && (
            <CardContent className="overflow-auto animate-in fade-in zoom-in-95 duration-300" style={{ height: dynamicProfitChartHeight + 'px' }}>
              {topProfitProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProfitProductsData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold' }} 
                      width={150} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Utilidad Neta']}
                    />
                    <Bar dataKey="profit" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                  No hay datos suficientes para calcular utilidades.
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Gráfico de Clientes Top por Compras */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Clientes Top por Volumen de Compra
              </CardTitle>
              {!minimized['topCustomers'] && <CardDescription>Top 10 clientes por valor total facturado y bultos adquiridos</CardDescription>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => toggleMinimize('topCustomers')}>
              {minimized['topCustomers'] ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {!minimized['topCustomers'] && (
            <CardContent className="overflow-auto animate-in fade-in zoom-in-95 duration-300" style={{ height: dynamicCustomersChartHeight + 'px' }}>
              {topCustomersData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomersData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 'bold' }} 
                      width={180} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string, props: any) => {
                        const bundles = props.payload.bundles;
                        return [
                          `$${value.toLocaleString()} (${bundles} bultos)`,
                          'Total Comprado'
                        ];
                      }}
                    />
                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                  No hay datos de clientes registrados en este periodo.
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </main>
  );
}
