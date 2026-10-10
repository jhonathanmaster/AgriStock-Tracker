
"use client";

import { use, useMemo, useState, useEffect } from 'react';
import { useAgriStock } from '@/lib/store';
import { api, RequestError } from '@/lib/data-store';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Sprout, 
  ArrowLeft, 
  ShoppingCart, 
  Package, 
  Layers, 
  Truck, 
  ShieldCheck, 
  Globe, 
  Info, 
  Mail, 
  MapPin, 
  ChevronRight, 
  ImageIcon, 
  Phone, 
  CheckCircle2, 
  Loader2, 
  CalendarCheck, 
  Facebook, 
  Clock,
  MessageSquare,
  Share2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UnitType } from '@/lib/types';

/**
 * Utilidad para generar un slug amigable a partir del nombre del producto.
 */
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .trim()
    .replace(/\s+/g, '-') // Reemplazar espacios por guiones
    .replace(/[^\w-]+/g, '') // Eliminar caracteres no permitidos
    .replace(/--+/g, '-'); // Evitar guiones dobles
};

/**
 * Calcula la fecha sumando días hábiles (omitiendo fines de semana)
 */
const addBusinessDays = (startDate: Date, days: number) => {
  let date = new Date(startDate);
  let count = 0;
  while (count < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      count++;
    }
  }
  return date;
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = use(params);
  const { products, isLoading } = useAgriStock();
  const { toast } = useToast();

  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerIdentification: '',
    customerAddress: '',
    quantity: '1'
  });

  // Buscar el producto por coincidencia de slug
  const product = useMemo(() => {
    if (!slug || !products || products.length === 0) return null;
    return products.find(p => slugify(p.name) === slug);
  }, [products, slug]);

  if (isLoading) return <LoadingScreen />;

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F6F8ED] flex items-center justify-center p-4">
        <div className="text-center space-y-6 bg-white p-12 rounded-3xl shadow-xl max-w-md">
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
            <Package className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Producto no encontrado</h1>
            <p className="text-muted-foreground">El insumo que buscas no existe o ha sido retirado del catálogo.</p>
          </div>
          <Button asChild className="w-full h-12 font-bold">
            <Link href="/">Volver al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone || !formData.quantity) {
      toast({ variant: "destructive", title: "Error", description: "Por favor completa los campos obligatorios." });
      return;
    }

    setIsSubmitting(true);
    try {
      // The server takes the price from the catalog, saves the customer and creates the order.
      await api('POST', '/api/public/orders', {
        productId: product.id,
        quantity: parseFloat(formData.quantity),
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        customerIdentification: formData.customerIdentification,
      });

      setOrderSuccess(true);
      toast({ title: "Solicitud Recibida", description: "Tu pedido ha sido registrado con éxito." });

    } catch (error) {
      console.error("Fallo al procesar pedido:", error);
      toast({ variant: "destructive", title: "Error", description: error instanceof RequestError && error.status < 500 ? error.message : "No se pudo procesar tu solicitud en este momento." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareProduct = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: product.name,
      text: `Mira este producto en GeiaTienda: ${product.name}`,
      url: url
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData).catch(() => {
          if (url) navigator.clipboard.writeText(url);
          toast({ title: "Enlace Copiado", description: "El link del producto se ha copiado al portapapeles." });
        });
      } else {
        if (url) await navigator.clipboard.writeText(url);
        toast({ title: "Enlace Copiado", description: "El link del producto se ha copiado al portapapeles." });
      }
    } catch (err) {
      console.error("Error al compartir:", err);
      if (url) navigator.clipboard.writeText(url);
      toast({ title: "Enlace Copiado", description: "El link del producto se ha copiado al portapapeles." });
    }
  };

  const getWhatsappUrl = () => {
    const message = encodeURIComponent(`Hola GeiaTienda, acabo de solicitar ${formData.quantity} ${product.mainUnit} de ${product.name} (Ref: ${product.referenceCode}) a través del portal web. Mi nombre es ${formData.customerName}.`);
    return `https://wa.me/573219130614?text=${message}`;
  };

  return (
    <div className="min-h-screen bg-[#F6F8ED] flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl text-primary leading-none">GeiaTienda</h1>
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">Suministros Agrícolas</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <a 
              href="https://wa.me/573219130614" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 mr-4 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-black text-primary">321 913 0614</span>
            </a>
            <Link href="/contact">
              <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent/10 h-10 px-6 font-bold shadow-sm hidden sm:flex">
                <Mail className="w-4 h-4" />
                Contáctenos
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="font-bold gap-2">
                <ArrowLeft className="w-4 h-4" />
                Regresar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex-1 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* GALERÍA / IMAGEN */}
          <div className="space-y-6">
            <Card className="overflow-hidden border-none shadow-2xl bg-white aspect-square relative rounded-[2rem]">
              {product.imageUrl ? (
                <Image 
                  src={product.imageUrl} 
                  alt={product.name} 
                  fill 
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/20 bg-muted/30">
                  <ImageIcon className="w-32 h-32" />
                  <span className="text-xs uppercase font-black tracking-widest mt-4">Imagen no disponible</span>
                </div>
              )}
              <div className="absolute top-6 left-6 flex flex-col gap-2">
                <Badge className="bg-primary/90 text-white backdrop-blur-md border-none px-4 py-1.5 text-xs font-bold shadow-lg">
                  {product.category}
                </Badge>
                {product.isImported && (
                  <Badge className="bg-accent/90 text-white backdrop-blur-md border-none px-4 py-1.5 text-xs font-bold gap-2 shadow-lg">
                    <Globe className="w-4 h-4" /> PRODUCTO IMPORTADO
                  </Badge>
                )}
              </div>
            </Card>
            
            <div className="grid grid-cols-3 gap-4 px-2">
               <div className="aspect-square bg-white rounded-2xl border border-border flex flex-col items-center justify-center gap-2 shadow-sm text-primary/40">
                 <Package className="w-6 h-6" />
                 <span className="text-[8px] font-black uppercase tracking-tighter">Calidad</span>
               </div>
               <div className="aspect-square bg-white rounded-2xl border border-border flex flex-col items-center justify-center gap-2 shadow-sm text-primary/40">
                 <ShieldCheck className="w-6 h-6" />
                 <span className="text-[8px] font-black uppercase tracking-tighter">Garantía</span>
               </div>
               <div className="aspect-square bg-white rounded-2xl border border-border flex flex-col items-center justify-center gap-2 shadow-sm text-primary/40">
                 <Truck className="w-6 h-6" />
                 <span className="text-[8px] font-black uppercase tracking-tighter">Entrega</span>
               </div>
            </div>
          </div>

          {/* INFORMACIÓN */}
          <div className="space-y-8 lg:pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Referencia: {product.referenceCode}</span>
                <Button variant="ghost" size="sm" onClick={handleShareProduct} className="text-muted-foreground hover:text-primary gap-2 h-8 px-3 rounded-full">
                  <Share2 className="w-4 h-4" />
                  Compartir
                </Button>
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
                {product.name}
              </h2>
              <div className="flex items-center gap-2 text-accent font-black uppercase text-sm tracking-widest bg-accent/5 w-fit px-4 py-1 rounded-full border border-accent/10">
                <Layers className="w-4 h-4" />
                Para: {product.animalType}
              </div>
            </div>

            <Separator className="bg-border/60" />

            <div className="space-y-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Precio Especial de Venta</p>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl font-black text-primary tracking-tighter">
                  ${product.salePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <Badge variant="outline" className="text-xs font-black h-8 px-4 border-primary/30 text-primary uppercase tracking-widest rounded-full">
                  POR {product.mainUnit.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                <Info className="w-3 h-3" /> 
                Precio sujeto a cambios según volumen y disponibilidad de stock.
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12" />
              <h3 className="font-black text-lg uppercase tracking-widest text-foreground flex items-center gap-2">
                Detalles del Insumo
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg italic">
                {product.description || "Este es un insumo de alta calidad seleccionado especialmente para garantizar el mejor rendimiento en su producción agrícola profesional. Contamos con stock disponible para entrega inmediata y asesoría técnica especializada."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <Button 
                size="lg" 
                className="h-20 text-xl font-black gap-3 shadow-2xl rounded-3xl hover:scale-[1.02] transition-transform active:scale-95 bg-primary"
                onClick={() => {
                  setOrderSuccess(false);
                  setIsOrderDialogOpen(true);
                }}
              >
                <ShoppingCart className="w-6 h-6" />
                Solicitar Ahora
              </Button>
              <Button size="lg" variant="outline" className="h-20 text-xl font-black gap-3 border-4 rounded-3xl hover:bg-primary/5 transition-all" asChild>
                <Link href={`https://wa.me/573219130614?text=Hola,%20me%20gustaría%20consultar%20sobre%20el%20producto:%20${encodeURIComponent(product.name)}`} target="_blank">
                  <Phone className="w-6 h-6" />
                  Consultar
                </Link>
              </Button>
            </div>

            <div className="bg-secondary/30 p-8 rounded-[2.5rem] border-2 border-dashed border-primary/20">
              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Garantía GeiaTienda
              </h4>
              <ul className="space-y-4 text-sm text-foreground font-medium">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  Calidad de origen certificada y garantizada.
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  Acompañamiento y asesoría técnica en su compra.
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  Distribución logística eficiente en todo el Valle.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* DIALOG DE SOLICITUD */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] overflow-hidden">
          {!orderSuccess ? (
            <>
              <DialogHeader className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto md:mx-0">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black">Solicitar Pedido</DialogTitle>
                  <DialogDescription>
                    Completa tus datos para registrar el encargo de <b className="text-primary">{product.name}</b>.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <form onSubmit={handleOrderSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre Completo *</Label>
                  <Input 
                    id="customerName" 
                    placeholder="Tu nombre" 
                    value={formData.customerName}
                    onChange={e => setFormData({...formData, customerName: e.target.value})}
                    required 
                    className="h-12 rounded-xl bg-muted/20 border-none focus-visible:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Teléfono de Contacto *</Label>
                    <Input 
                      id="customerPhone" 
                      placeholder="321..." 
                      value={formData.customerPhone}
                      onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                      required 
                      className="h-12 rounded-xl bg-muted/20 border-none focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Correo Electrónico</Label>
                    <Input 
                      id="customerEmail" 
                      type="email"
                      placeholder="ejemplo@correo.com" 
                      value={formData.customerEmail}
                      onChange={e => setFormData({...formData, customerEmail: e.target.value})}
                      className="h-12 rounded-xl bg-muted/20 border-none focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cantidad ({product.mainUnit}) *</Label>
                    <Input 
                      id="quantity" 
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: e.target.value})}
                      required 
                      className="h-12 rounded-xl bg-muted/20 border-none focus-visible:ring-primary font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerIdentification" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID Fiscal (Opcional)</Label>
                    <Input 
                      id="customerIdentification" 
                      placeholder="CC / NIT" 
                      value={formData.customerIdentification}
                      onChange={e => setFormData({...formData, customerIdentification: e.target.value})}
                      className="h-12 rounded-xl bg-muted/20 border-none focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerAddress" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dirección de Entrega (Opcional)</Label>
                  <Input 
                    id="customerAddress" 
                    placeholder="Finca o Barrio" 
                    value={formData.customerAddress}
                    onChange={e => setFormData({...formData, customerAddress: e.target.value})}
                    className="h-12 rounded-xl bg-muted/20 border-none focus-visible:ring-primary"
                  />
                </div>

                <div className="bg-accent/5 p-4 rounded-2xl border border-accent/10 flex items-center gap-3">
                  <CalendarCheck className="w-5 h-5 text-accent shrink-0" />
                  <p className="text-[10px] text-accent font-bold leading-tight uppercase">
                    Fecha estimada de entrega: <br/>
                    <span className="text-xs">{addBusinessDays(new Date(), 3).toLocaleDateString('es-ES', { dateStyle: 'long' })}</span>
                  </p>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl text-lg font-black gap-2 shadow-lg">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                  Confirmar Solicitud
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-8 space-y-6 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-primary">¡Solicitud Enviada!</h3>
                <p className="text-muted-foreground text-sm px-4">
                  Hemos registrado tu pedido correctamente. Nuestro equipo revisará los detalles a la brevedad.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  asChild 
                  className="h-14 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold gap-2 shadow-lg transition-all hover:scale-[1.02]"
                >
                  <a href={getWhatsappUrl()} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="w-5 h-5" />
                    Hablar por WhatsApp
                  </a>
                </Button>
                <Button onClick={() => setIsOrderDialogOpen(false)} variant="outline" className="h-12 rounded-xl">
                  Cerrar Ventana
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FOOTER */}
      <footer className="bg-white border-t border-border py-12 mt-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
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
              <li><Link href="/about" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Quiénes Somos</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Acceso Personal</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Contáctenos</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Contacto Directo</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Corregimiento de Borrero Ayerbe, Dagua - Valle</p>
              <a 
                href="https://wa.me/573219130614" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 font-bold text-primary hover:underline"
              >
                <Phone className="w-4 h-4" /> 321 913 0614
              </a>
              <p className="flex items-center gap-2 font-bold text-primary"><Mail className="w-4 h-4" /> grupoempresarialinversonessas@gmail.com</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Horario de Atención</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> Lunes a Sábado: 8am - 6pm</p>
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> Domingos: 8am - 12pm</p>
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
