
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser, signOut } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Package, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  ShieldX, 
  DollarSign,
  Sprout,
  LogIn,
  Search,
  ChevronRight,
  Archive,
  Globe,
  Image as ImageIcon,
  Mail,
  LayoutDashboard,
  MapPin,
  Clock,
  X,
  Phone,
  Facebook,
  Share2,
  History as HistoryIcon,
  BarChart3 as BarChartIcon,
  Truck
} from 'lucide-react';
import { QuickSale } from '@/components/QuickSale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { cn } from '@/lib/utils';
import placeholderData from '@/app/lib/placeholder-images.json';
import { useToast } from '@/hooks/use-toast';

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

function PublicLanding() {
  const { products, categories } = useAgriStock();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const heroImage = useMemo(() => {
    return placeholderData?.placeholderImages?.find(img => img.id === 'hero-farm-landscape');
  }, []);

  const activeCategories = useMemo(() => {
    if (!products || !categories) return [];
    const productCategoryNames = new Set(products.map(p => p.category));
    return categories.filter(cat => productCategoryNames.has(cat.name));
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                           (p.referenceCode?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleShare = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareData = {
      title: 'GeiaTienda Tracker',
      text: 'Gestiona tu inventario agrícola con GeiaTienda. ¡Mira nuestro catálogo!',
      url: origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(origin);
        toast({ title: "Enlace Copiado", description: "El link del portal se ha copiado al portapapeles." });
      }
    } catch (err) {
      console.error("Error al compartir:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8ED] flex flex-col">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl text-primary leading-none">GeiaTienda</h1>
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">Suministros Agrícolas</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href="https://wa.me/573219130614" target="_blank" rel="noopener noreferrer" className="hidden lg:flex items-center gap-2 mr-4 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-all">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-black text-primary">321 913 0614</span>
            </a>
            <Link href="/transporte" className="hidden md:block">
              <Button variant="ghost" className="gap-2 font-bold text-accent h-10 px-4">
                <Truck className="w-4 h-4" />
                Transporte
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground hover:text-primary gap-2 h-10 px-3">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>
            <Link href="/contact" className="hidden sm:block">
              <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent/10 h-10 px-6 font-bold shadow-sm">
                <Mail className="w-4 h-4" />
                Contacto
              </Button>
            </Link>
            {!user ? (
              <Link href="/login">
                <Button variant="default" className="gap-2 shadow-md h-10 px-6 font-bold">
                  <LogIn className="w-4 h-4" />
                  Acceder
                </Button>
              </Link>
            ) : (
              <Link href="/">
                <Button variant="default" className="gap-2 shadow-md h-10 px-6 font-bold">
                  <LayoutDashboard className="w-4 h-4" />
                  Tablero
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-24 md:py-36 text-white">
        <div className="absolute inset-0 z-0">
          <Image src={heroImage?.imageUrl || "https://picsum.photos/seed/pig-farm-hero-banner/1920/1080"} alt="Granja" fill className="object-cover" priority unoptimized />
          <div className="absolute inset-0 bg-black/40 backdrop-brightness-75" />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center space-y-8">
          <Badge className="bg-primary/90 text-white border-none px-6 py-1.5 text-xs font-bold uppercase tracking-[0.2em]">Nutrición Animal</Badge>
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-black tracking-tight max-w-4xl mx-auto leading-[1.1]">Lo mejor para el campo.</h2>
            <p className="text-white/90 text-xl md:text-2xl max-w-2xl mx-auto font-medium">Concentrados, suplementos y herramientas profesionales.</p>
          </div>
          <div className="flex justify-center pt-4">
            <Button size="lg" className="rounded-full h-14 px-10 text-lg font-bold shadow-2xl" asChild>
              <a href="#catalogo">Ver Catálogo</a>
            </Button>
          </div>
        </div>
      </section>

      <main id="catalogo" className="container mx-auto px-4 py-12 flex-1 space-y-10">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-white p-6 rounded-2xl border border-border shadow-sm">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-10 h-12 bg-muted/20 border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar">
            <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory('all')} className="rounded-full px-6 font-bold">Todos</Button>
            {activeCategories.map(cat => (
              <Button key={cat.id} variant={selectedCategory === cat.name ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat.name)} className="rounded-full px-6 font-bold whitespace-nowrap">{cat.name}</Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map(p => (
            <Link key={p.id} href={`/producto/${slugify(p.name)}`} className="flex flex-col h-full group">
              <Card className="group overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white flex flex-col h-full">
                <div className="relative h-56 w-full bg-muted">
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/30 bg-muted/50">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    <Badge className="bg-primary/90 text-white border-none">{p.category}</Badge>
                  </div>
                </div>
                <CardHeader className="p-5 pb-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{p.referenceCode}</p>
                  <CardTitle className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 italic min-h-[32px]">{p.description}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase"><Archive className="w-3.5 h-3.5" /> Para {p.animalType}</div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-dashed border-border flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Precio</p>
                      <p className="text-2xl font-black text-primary leading-none">${p.salePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 rounded-full text-[10px] font-black uppercase tracking-tight gap-1 border-primary/20 text-primary">Ver Ficha <ChevronRight className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="bg-accent text-white border-none rounded-[2rem] overflow-hidden shadow-2xl mt-20 relative group">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
            <div className="p-8 md:p-12 space-y-6">
              <Badge className="bg-white/20 text-white border-none px-4 py-1 text-xs font-bold uppercase">Logística de Carga</Badge>
              <h3 className="text-4xl md:text-5xl font-black leading-tight">¿Necesitas transportar mercancía?</h3>
              <p className="text-white/80 text-lg leading-relaxed">
                Ofrecemos servicio de flete especializado con camión propio. Llevamos tus bultos, herramientas o carga pesada con total seguridad y seguimiento en tiempo real.
              </p>
              <Button asChild size="lg" className="h-14 px-8 bg-white text-accent hover:bg-white/90 font-black rounded-xl text-lg shadow-xl gap-2">
                <Link href="/transporte">
                  <Truck className="w-6 h-6" />
                  Solicitar Cotización Ahora
                </Link>
              </Button>
            </div>
            <div className="relative h-full min-h-[300px] hidden lg:block">
               <Image src="https://picsum.photos/seed/truck-service/800/600" alt="Camión GeiaTienda" fill className="object-cover" unoptimized />
            </div>
          </div>
        </Card>
      </main>

      <footer className="bg-white border-t border-border py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <Sprout className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg text-primary">GeiaTienda</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gestión profesional de suministros para granjas y proyectos agrícolas. Eficiencia y control desde el inventario hasta la venta.
            </p>
            <div className="flex gap-3">
              <Link 
                href="https://www.facebook.com/share/1GFxFY1r7J/?mibextid=wwXIfr" 
                target="_blank" 
                className="bg-primary/10 p-2 rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                title="Síguenos en Facebook"
              >
                <Facebook className="w-5 h-5" />
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Inicio / Catálogo</Link></li>
              <li><Link href="/transporte" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Servicio de Transporte</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Quiénes Somos</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Contáctenos</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Contacto Directo</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Borrero Ayerbe, Dagua - Valle</p>
              <a href="https://wa.me/573219130614" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-primary hover:underline">
                <Phone className="w-4 h-4" /> 321 913 0614
              </a>
              <p className="flex items-center gap-2 font-bold text-primary"><Mail className="w-4 h-4" /> grupoempresarialinversonessas@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} GeiaTienda Tracker - Gestión Profesional de Inventario
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { 
    products, 
    recordMovement, 
    saveCustomer,
    dailyIncome, 
    totalHistoricalIncome,
    totalHistoricalCostOfGoodsSold,
    totalHistoricalExpenses,
    initialCapital,
    criticalThreshold,
    isLoading, 
    isEnabled,
    isAdmin
  } = useAgriStock();
  
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get('view');
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    // Only set on client to avoid hydration mismatch
    setCurrentDate(new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  if (isLoading) return <LoadingScreen />;
  if (!user || viewParam === 'site') return <PublicLanding />;

  if (!isEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F8ED] p-4 text-center">
        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6"><ShieldX className="w-12 h-12" /></div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Acceso Restringido</h1>
        <p className="text-muted-foreground max-w-md mb-8">Tu cuenta aún no ha sido habilitada. Por favor, contacta a soporte.</p>
        <Button onClick={async () => { await signOut(); router.push('/'); }} variant="outline">Cerrar Sesión</Button>
      </div>
    );
  }

  const totalStockKg = (products || []).reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockProducts = (products || []).filter(p => (p.stock || 0) <= criticalThreshold);
  const netProfit = (initialCapital || 0) + (totalHistoricalIncome || 0) - (totalHistoricalCostOfGoodsSold || 0) - (totalHistoricalExpenses || 0);

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resumen General</h1>
            <p className="text-muted-foreground">Estado actual del inventario</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-muted-foreground">Fecha Actual</p>
          <p className="font-bold">{currentDate || "Cargando..."}</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Productos Activos</CardTitle><Package className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{products.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Stock Total</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalStockKg.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Alerta Stock</CardTitle><AlertTriangle className="h-4 w-4 text-accent" /></CardHeader><CardContent><div className="text-2xl font-bold">{lowStockProducts.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle><TrendingDown className="h-4 w-4 text-accent" /></CardHeader><CardContent><div className="text-2xl font-bold">${(dailyIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </section>

      {isAdmin && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-accent/20 bg-accent/5"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider text-accent">Costo Mercancía</CardTitle></CardHeader><CardContent><div className="text-xl font-extrabold">${(totalHistoricalCostOfGoodsSold || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent></Card>
          <Card className="border-blue-600/20 bg-blue-50"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-700">Capital Inicial</CardTitle></CardHeader><CardContent><div className="text-xl font-extrabold">${(initialCapital || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent></Card>
          <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Ingresos Globales</CardTitle></CardHeader><CardContent><div className="text-xl font-extrabold">${(totalHistoricalIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent></Card>
          <Card className="border-destructive/20 bg-destructive/5"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider text-destructive">Egresos Totales</CardTitle></CardHeader><CardContent><div className="text-xl font-extrabold">${(totalHistoricalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent></Card>
          <Card className={cn("border-opacity-20", netProfit >= 0 ? "border-green-600 bg-green-50" : "border-destructive bg-destructive/5")}><CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider">Utilidad Neta</CardTitle></CardHeader><CardContent><div className="text-xl font-extrabold">${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent></Card>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-accent" /> Inventario Crítico</CardTitle><Badge variant="destructive">{lowStockProducts.length}</Badge></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Referencia</TableHead><TableHead className="text-right">Stock</TableHead></TableRow></TableHeader>
              <TableBody>
                {lowStockProducts.slice(0, 5).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-bold">{p.name}</TableCell>
                    <TableCell className="text-[10px] font-mono">{p.referenceCode}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">{p.stock.toFixed(1)} {p.mainUnit}</TableCell>
                  </TableRow>
                ))}
                {lowStockProducts.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Stock en niveles óptimos.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <QuickSale products={products} onSale={(pId, qty, unit, totalValue, ivaPercentage, subTotal, ivaValue, saleDate, customerData) => {
          if (customerData?.name && customerData?.phone) saveCustomer(customerData);
          recordMovement({ productId: pId, type: 'venta', quantity: qty, unit, totalValue, ivaPercentage, subTotal, ivaValue, movementDateTime: saleDate, ...customerData });
        }} />
      </div>
    </main>
  );
}
