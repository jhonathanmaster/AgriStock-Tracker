
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
  TrendingUp as TrendingUpIcon, 
  TrendingDown as TrendingDownIcon, 
  ShieldCheck as ShieldCheckIcon,
  PiggyBank,
  Calendar as CalendarIcon,
  Minus,
  Plus,
  BarChart3 as BarChartIcon,
  Package as PackageIcon,
  ShoppingCart as ShoppingCartIcon,
  Truck as TruckIcon,
  Users as UsersIcon,
  DollarSign as DollarSignIcon,
  Layers as LayersIcon,
  Wallet as WalletIcon,
  History as HistoryIcon
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const COLORS = ['#4D7C0F', '#f59e0b', '#2563eb', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ReportsPage() {
  const { 
    products, 
    movements, 
    expenses, 
    purchaseOrders,
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

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && !isLoading && user && !isAdmin && !isSuperAdmin) {
      router.push('/');
    }
  }, [user, isUserLoading, isLoading, router, isAdmin, isSuperAdmin]);

  const filteredData = useMemo(() => {
    if (!mounted) return { movementsList: [], expensesList: [], purchaseOrdersList: [], income: 0, expensesTotal: 0, cogsTotal: 0 };
    
    const now = new Date();
    let movementsList = movements || [];
    let expensesList = expenses || [];
    let purchaseOrdersList = purchaseOrders || [];

    if (period === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      movementsList = movementsList.filter(m => m.movementDateTime && new Date(m.movementDateTime) >= thirtyDaysAgo);
      expensesList = expensesList.filter(e => e.date && new Date(e.date) >= thirtyDaysAgo);
      purchaseOrdersList = purchaseOrdersList.filter(o => o.requestDate && new Date(o.requestDate) >= thirtyDaysAgo);
    } else if (period === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      movementsList = movementsList.filter(m => m.movementDateTime && new Date(m.movementDateTime) >= sevenDaysAgo);
      expensesList = expensesList.filter(e => e.date && new Date(e.date) >= sevenDaysAgo);
      purchaseOrdersList = purchaseOrdersList.filter(o => o.requestDate && new Date(o.requestDate) >= sevenDaysAgo);
    }

    const income = movementsList.filter(m => m.type === 'venta').reduce((sum, m) => sum + (m.totalValue || 0), 0);
    const expensesTotal = expensesList.reduce((sum, e) => sum + (e.total || 0), 0);
    
    const cogsTotal = movementsList
      .filter(m => m.type === 'venta')
      .reduce((sum, m) => {
        const prod = products.find(p => p.id === m.productId);
        if (!prod) return sum;
        const qtyInBase = convertQuantity(m.quantity || 0, m.unit, prod.mainUnit);
        const unitCost = (prod.costPrice || 0) + (prod.transportPricePerBundle || 0);
        return sum + (qtyInBase * unitCost);
      }, 0);
    
    return { movementsList, expensesList, purchaseOrdersList, income, expensesTotal, cogsTotal };
  }, [movements, expenses, purchaseOrders, period, products, convertQuantity, mounted]);

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const monthlySalesFinances = useMemo(() => {
    if (!mounted) return [];
    const dataMap: Record<string, { key: string, month: string, ventas: number, utilidad: number }> = {};
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      const date = new Date(m.movementDateTime);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!dataMap[key]) {
        dataMap[key] = { key, month: `${months[date.getMonth()]} ${date.getFullYear()}`, ventas: 0, utilidad: 0 };
      }
      dataMap[key].ventas += (m.totalValue || 0);
      const prod = products.find(p => p.id === m.productId);
      if (prod) {
        const qtyInBase = convertQuantity(m.quantity || 0, m.unit, prod.mainUnit);
        const unitCost = (prod.costPrice || 0) + (prod.transportPricePerBundle || 0);
        dataMap[key].utilidad += (m.totalValue || 0) - (qtyInBase * unitCost);
      }
    });
    return Object.values(dataMap).sort((a,b) => a.key.localeCompare(b.key));
  }, [filteredData, products, convertQuantity, mounted]);

  const combinedMonthlyLogisticData = useMemo(() => {
    if (!mounted) return [];
    const dataMap: Record<string, { key: string, month: string, vendidos: number, comprados: number }> = {};
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      const date = new Date(m.movementDateTime);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!dataMap[key]) {
        dataMap[key] = { key, month: `${months[date.getMonth()]} ${date.getFullYear()}`, vendidos: 0, comprados: 0 };
      }
      dataMap[key].vendidos += convertQuantity(m.quantity || 0, m.unit, 'bultos');
    });
    filteredData.purchaseOrdersList.forEach(o => {
      if (!o.requestDate) return;
      const date = new Date(o.requestDate);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!dataMap[key]) {
        dataMap[key] = { key, month: `${months[date.getMonth()]} ${date.getFullYear()}`, vendidos: 0, comprados: 0 };
      }
      dataMap[key].comprados += convertQuantity(o.quantity, o.unit, 'bultos');
    });
    return Object.values(dataMap).sort((a,b) => a.key.localeCompare(b.key));
  }, [filteredData, convertQuantity, mounted]);

  const purchaseDailyBultosData = useMemo(() => {
    if (!mounted) return [];
    const dataMap: Record<string, { date: string, bultos: number }> = {};
    filteredData.purchaseOrdersList.forEach(o => {
      if (!o.requestDate) return;
      const dateObj = new Date(o.requestDate);
      const isoKey = dateObj.toISOString().split('T')[0];
      const d = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!dataMap[isoKey]) dataMap[isoKey] = { date: d, bultos: 0 };
      dataMap[isoKey].bultos += convertQuantity(o.quantity, o.unit, 'bultos');
    });
    return Object.entries(dataMap).sort((a,b) => a[0].localeCompare(b[0])).map(e => e[1]);
  }, [filteredData, convertQuantity, mounted]);

  const productPerformanceData = useMemo(() => {
    if (!mounted) return [];
    const dataMap: Record<string, { name: string, ingresos: number, utilidad: number }> = {};
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      const prod = products.find(p => p.id === m.productId);
      if (prod) {
        if (!dataMap[prod.id]) dataMap[prod.id] = { name: prod.name, ingresos: 0, utilidad: 0 };
        dataMap[prod.id].ingresos += (m.totalValue || 0);
        const qtyInBase = convertQuantity(m.quantity || 0, m.unit, prod.mainUnit);
        const unitCost = (prod.costPrice || 0) + (prod.transportPricePerBundle || 0);
        dataMap[prod.id].utilidad += (m.totalValue || 0) - (qtyInBase * unitCost);
      }
    });
    return Object.values(dataMap).sort((a,b) => b.ingresos - a.ingresos);
  }, [filteredData, products, convertQuantity, mounted]);

  const categoryPerformanceData = useMemo(() => {
    if (!mounted) return [];
    const dataMap: Record<string, { category: string, ingresos: number, utilidad: number }> = {};
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      const prod = products.find(p => p.id === m.productId);
      if (prod) {
        const cat = prod.category || 'Sin Categoría';
        if (!dataMap[cat]) dataMap[cat] = { category: cat, ingresos: 0, utilidad: 0 };
        dataMap[cat].ingresos += (m.totalValue || 0);
        const qtyInBase = convertQuantity(m.quantity || 0, m.unit, prod.mainUnit);
        const unitCost = (prod.costPrice || 0) + (prod.transportPricePerBundle || 0);
        dataMap[cat].utilidad += (m.totalValue || 0) - (qtyInBase * unitCost);
      }
    });
    return Object.values(dataMap).sort((a,b) => b.ingresos - a.ingresos);
  }, [filteredData, products, convertQuantity, mounted]);

  const inventoryValueByCategoryData = useMemo(() => {
    if (!mounted) return [];
    const dataMap: Record<string, { category: string, valor: number }> = {};
    products.forEach(p => {
      const cat = p.category || 'Sin Categoría';
      const value = (p.stock || 0) * ((p.costPrice || 0) + (p.transportPricePerBundle || 0));
      if (!dataMap[cat]) dataMap[cat] = { category: cat, valor: 0 };
      dataMap[cat].valor += value;
    });
    return Object.values(dataMap).sort((a, b) => b.valor - a.valor);
  }, [products, mounted]);

  const topCustomersData = useMemo(() => {
    if (!mounted) return [];
    const dataMap: Record<string, { name: string, bultos: number }> = {};
    filteredData.movementsList.filter(m => m.type === 'venta' && m.customerName).forEach(m => {
      const key = m.customerName!;
      if (!dataMap[key]) dataMap[key] = { name: key, bultos: 0 };
      dataMap[key].bultos += convertQuantity(m.quantity, m.unit, 'bultos');
    });
    return Object.values(dataMap).sort((a,b) => b.bultos - a.bultos).slice(0, 8);
  }, [filteredData, convertQuantity, mounted]);

  const chartTimelineData = useMemo(() => {
    if (!mounted) return [];
    const dataMap: Record<string, { iso: string, date: string, ingresos: number, gastos: number }> = {};
    filteredData.movementsList.filter(m => m.type === 'venta').forEach(m => {
      if (!m.movementDateTime) return;
      const dateObj = new Date(m.movementDateTime);
      const isoKey = dateObj.toISOString().split('T')[0];
      const d = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!dataMap[isoKey]) dataMap[isoKey] = { iso: isoKey, date: d, ingresos: 0, gastos: 0 };
      dataMap[isoKey].ingresos += (m.totalValue || 0);
    });
    filteredData.expensesList.forEach(e => {
      if (!e.date) return;
      const dateObj = new Date(e.date);
      const isoKey = dateObj.toISOString().split('T')[0];
      const d = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!dataMap[isoKey]) dataMap[isoKey] = { iso: isoKey, date: d, ingresos: 0, gastos: 0 };
      dataMap[isoKey].gastos += (e.total || 0);
    });
    return Object.values(dataMap).sort((a, b) => a.iso.localeCompare(b.iso));
  }, [filteredData, mounted]);

  if (isUserLoading || isLoading || !mounted) return <LoadingScreen />;
  if (!user || (!isAdmin && !isSuperAdmin)) return null;

  const netProfitTotal = (initialCapital || 0) + (filteredData.income || 0) - (filteredData.cogsTotal || 0) - (filteredData.expensesTotal || 0);

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Análisis de Operaciones</h1>
              <Badge variant="outline" className="text-accent border-accent gap-1">
                <ShieldCheckIcon className="w-3 h-3" /> Reportes Ejecutivos
              </Badge>
            </div>
            <p className="text-muted-foreground">Monitoreo de rentabilidad, volumen logístico y comercial</p>
          </div>
        </div>
        
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-[180px] bg-white">
            <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Histórico Completo</SelectItem>
            <SelectItem value="30days">Últimos 30 días</SelectItem>
            <SelectItem value="7days">Últimos 7 días</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest text-primary">Utilidad Neta Periodo</CardDescription>
            <CardTitle className={cn("text-2xl font-black", netProfitTotal >= 0 ? "text-primary" : "text-destructive")}>
              ${netProfitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest text-accent">Ventas Totales ($)</CardDescription>
            <CardTitle className="text-2xl font-black text-foreground">
              ${filteredData.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white border-blue-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest text-blue-600">Bultos Comprados</CardDescription>
            <CardTitle className="text-2xl font-black text-foreground">
              {combinedMonthlyLogisticData.reduce((s, d) => s + d.comprados, 0).toFixed(1)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white border-muted">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Bultos Vendidos</CardDescription>
            <CardTitle className="text-2xl font-black text-foreground">
              {combinedMonthlyLogisticData.reduce((s, d) => s + d.vendidos, 0).toFixed(1)}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-sm border-blue-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
              <WalletIcon className="w-5 h-5" /> Inversión en Bodega por Categoría
            </CardTitle>
            <CardDescription>Distribución financiera del capital en inventario</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={inventoryValueByCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="valor" label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                  {inventoryValueByCategoryData.map((entry, index) => <Cell key={`cell-inv-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, 'Valor']} />
                <Legend verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <LayersIcon className="w-5 h-5" /> Ingresos vs Utilidades por Categoría
            </CardTitle>
            <CardDescription>Margen real por línea de producto</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformanceData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="ingresos" fill="#4D7C0F80" radius={[4, 4, 0, 0]} name="Ingresos" />
                <Bar dataKey="utilidad" fill="#4D7C0F" radius={[4, 4, 0, 0]} name="Utilidad" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" /> Desempeño Mensual ($)
            </CardTitle>
            <CardDescription>Ventas y beneficios históricos</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySalesFinances}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="ventas" fill="#4D7C0F80" radius={[4, 4, 0, 0]} name="Ventas" />
                <Bar dataKey="utilidad" fill="#4D7C0F" radius={[4, 4, 0, 0]} name="Utilidad" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
              <TruckIcon className="w-5 h-5" /> Flujo de Compras Diarias (Bultos)
            </CardTitle>
            <CardDescription>Abastecimiento diario convertido a bultos</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={purchaseDailyBultosData}>
                <defs><linearGradient id="colorBultos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="bultos" stroke="#2563eb" strokeWidth={3} fill="url(#colorBultos)" name="Bultos" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-accent" /> Balance Logístico (Bultos)
            </CardTitle>
            <CardDescription>Compras vs Ventas mensuales</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedMonthlyLogisticData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="comprados" fill="#2563eb" radius={[4, 4, 0, 0]} name="Comprados" />
                <Bar dataKey="vendidos" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Vendidos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <BarChartIcon className="w-5 h-5" /> Ranking de Productos (Top 10)
            </CardTitle>
            <CardDescription>Ingresos y rentabilidad por ítem</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productPerformanceData.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} width={100} />
                <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="ingresos" fill="#4D7C0F" radius={[0, 4, 4, 0]} name="Ingresos" barSize={12} />
                <Bar dataKey="utilidad" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Utilidad" barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-accent">
              <UsersIcon className="w-5 h-5" /> Top Clientes por Volumen
            </CardTitle>
            <CardDescription>Compradores con mayor rotación (bultos)</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomersData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`${v.toFixed(1)} bultos`, '']} />
                <Bar dataKey="bultos" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Volumen" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <TrendingUpIcon className="w-5 h-5" /> Flujo de Caja Consolidado
            </CardTitle>
            <CardDescription>Ingresos vs Gastos operativos diarios</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTimelineData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4D7C0F" stopOpacity={0.1}/><stop offset="95%" stopColor="#4D7C0F" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorEx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip formatter={(val: number) => [`$${val.toLocaleString()}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="ingresos" stroke="#4D7C0F" strokeWidth={3} fill="url(#colorIn)" name="Ingresos" />
                <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={3} fill="url(#colorEx)" name="Gastos" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
