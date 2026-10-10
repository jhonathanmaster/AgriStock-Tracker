
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings, 
  ClipboardList, 
  Sprout, 
  LogOut, 
  User as UserIcon, 
  Users, 
  Tag, 
  Truck, 
  Contact,
  ClipboardCheck,
  ListTodo,
  Search,
  ReceiptText,
  Tags,
  BarChart3,
  CalendarCheck,
  Globe,
  HandCoins,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { useAgriStock } from '@/lib/store';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';

const navItems = [
  { label: 'Portal Web', icon: Globe, href: '/?view=site' },
  { label: 'Tablero', icon: LayoutDashboard, href: '/' },
  { label: 'Ventas Rápidas', icon: ShoppingCart, href: '/sales' },
  { label: 'Cotizaciones', icon: FileText, href: '/quotations' },
  { label: 'Créditos', icon: HandCoins, href: '/credits' },
  { label: 'Encargos', icon: CalendarCheck, href: '/orders' },
  { label: 'Verificación Inv.', icon: ShieldCheck, href: '/inventory-audit' },
  { label: 'Gastos', icon: ReceiptText, href: '/expenses' },
  { label: 'Órdenes Compra', icon: ClipboardCheck, href: '/purchase-orders' },
  { label: 'Seguimiento O.C.', icon: Search, href: '/purchase-tracking' },
  { label: 'Movimientos', icon: ClipboardList, href: '/movements' },
];

const adminItems = [
  { label: 'Reportes', icon: BarChart3, href: '/reports' },
  { label: 'Usuarios', icon: Users, href: '/admin' },
  { label: 'Clientes', icon: Contact, href: '/admin/customers' },
  { label: 'Inventario', icon: Package, href: '/inventory' },
  { label: 'Categorías Gastos', icon: Tags, href: '/admin/expense-categories' },
  { label: 'Estados O.C.', icon: ListTodo, href: '/admin/purchase-order-statuses' },
  { label: 'Animales', icon: Sprout, href: '/admin/animals', rotate: true },
  { label: 'Categorías', icon: Tag, href: '/admin/categories' },
  { label: 'Proveedores', icon: Truck, href: '/admin/suppliers' },
  { label: 'Configuración', icon: Settings, href: '/settings' },
];

export function Navigation() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { isAdmin } = useAgriStock();
  const auth = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPublicPath = pathname === '/login' || pathname === '/accept-invitation' || pathname === '/contact' || pathname.startsWith('/producto/');
  
  if (!mounted || isPublicPath || (!user && !isUserLoading)) {
    return null;
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/?view=site');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border shadow-sm">
      <SidebarHeader className="p-4 flex flex-row items-center gap-2 overflow-hidden">
        <div className="w-8 h-8 shrink-0 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
          <Sprout className="w-5 h-5" />
        </div>
        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
          <h1 className="font-bold text-base leading-tight text-primary truncate">GeiaTienda</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tracker</p>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "transition-all duration-200",
                        isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-secondary/50"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-accent font-bold uppercase text-[10px] px-4 py-2">
              Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive} 
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-200",
                          isActive 
                            ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                            : "text-accent hover:bg-accent/10"
                        )}
                      >
                        <Link href={item.href}>
                          <item.icon className={cn("w-4 h-4", item.rotate && "rotate-45")} />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t bg-white">
        <SidebarMenu>
          {user && (
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:px-0">
                <Avatar className="h-8 w-8 shrink-0 border border-border">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-xs font-bold text-foreground truncate">{user.displayName || 'Usuario'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              tooltip="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
