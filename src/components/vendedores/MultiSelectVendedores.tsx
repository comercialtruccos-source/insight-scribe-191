import React, { useState, useMemo } from "react";
import { CatalogoItem, esVendedorValido } from "@/lib/ventas-api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ChevronDown, Check, X, Sparkles } from "lucide-react";

interface MultiSelectVendedoresProps {
  vendedores: CatalogoItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  esAdmin?: boolean;
}

export function MultiSelectVendedores({
  vendedores = [],
  selectedIds = [],
  onChange,
  esAdmin = false,
}: MultiSelectVendedoresProps) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Filtrar estrictamente asesores comerciales válidos
  const vendedoresValidos = useMemo(() => {
    return vendedores.filter((v) => esVendedorValido(v.id, v.nombre));
  }, [vendedores]);

  // Mapa de IDs disponibles
  const todosIds = useMemo(() => vendedoresValidos.map((v) => String(v.id)), [vendedoresValidos]);

  // Vendedores filtrados por búsqueda
  const vendedoresFiltrados = useMemo(() => {
    if (!busqueda.trim()) return vendedoresValidos;
    const b = busqueda.trim().toLowerCase();
    return vendedoresValidos.filter(
      (v) => v.nombre.toLowerCase().includes(b) || String(v.id).includes(b)
    );
  }, [vendedoresValidos, busqueda]);

  // Manejo de toggle individual
  const toggleVendedor = (idStr: string) => {
    if (selectedIds.includes(idStr)) {
      onChange(selectedIds.filter((id) => id !== idStr));
    } else {
      onChange([...selectedIds, idStr]);
    }
  };

  // Seleccionar / Limpiar todos
  const seleccionarTodos = () => {
    onChange([]);
  };

  const limpiarSeleccion = () => {
    onChange([]);
  };

  // Etiqueta del botón disparador
  const etiquetaBoton = useMemo(() => {
    if (selectedIds.length === 0) {
      return esAdmin
        ? "Todos los Vendedores"
        : vendedores.length === 1
        ? (vendedores[0]?.nombre || "Mi Vendedor")
        : `Mis Vendedores (${vendedores.length})`;
    }
    if (selectedIds.length === 1) {
      const v = vendedores.find((item) => String(item.id) === selectedIds[0]);
      return v ? v.nombre : `Asesor #${selectedIds[0]}`;
    }
    return `${selectedIds.length} Asesores Seleccionados`;
  }, [selectedIds, vendedores, esAdmin]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 min-w-[160px] max-w-[220px] justify-between text-xs rounded-xl bg-background/90 border-border/80 shadow-2xs hover:border-primary/50 transition-all font-medium px-2.5"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{etiquetaBoton}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {selectedIds.length > 1 && (
              <Badge
                variant="secondary"
                className="h-4 px-1 text-[9.5px] font-bold bg-primary/15 text-primary border-primary/20"
              >
                {selectedIds.length}
              </Badge>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[calc(100vw-32px)] max-w-[320px] p-2.5 rounded-2xl border-border/80 shadow-xl bg-popover/98 backdrop-blur-md"
      >
        <div className="space-y-2">
          {/* Cabecera y Buscador */}
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Filtro Multi-Vendedor</span>
            </span>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={limpiarSeleccion}
                className="text-[10px] text-muted-foreground hover:text-rose-500 font-semibold"
              >
                Limpiar filtro
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o ID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 h-7 text-xs rounded-lg"
            />
          </div>

          {/* Botones de acción rápida */}
          <div className="flex items-center justify-between gap-1 text-[10.5px]">
            <Button
              type="button"
              variant={selectedIds.length === 0 ? "secondary" : "ghost"}
              size="sm"
              onClick={seleccionarTodos}
              className="h-6 px-2 text-[10.5px] font-semibold"
            >
              {selectedIds.length === 0 ? "✓ Todos Activos" : "Ver Todos"}
            </Button>

            <span className="text-[10px] text-muted-foreground">
              {vendedoresFiltrados.length} disponibles
            </span>
          </div>

          {/* Lista scrolleable de vendedores comerciales */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 pt-1 border-t border-border/50">
            {vendedoresFiltrados.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No se encontraron asesores.
              </div>
            ) : (
              vendedoresFiltrados.map((v) => {
                const idStr = String(v.id);
                const isChecked = selectedIds.includes(idStr);

                return (
                  <label
                    key={v.id}
                    className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-primary/10 text-foreground font-semibold"
                        : "hover:bg-muted/60 text-foreground/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleVendedor(idStr)}
                        className="h-3.5 w-3.5 rounded-xs"
                      />
                      <span className="truncate">{v.nombre}</span>
                    </div>

                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {v.allIds && v.allIds.length > 1 ? `${v.allIds.length} cuentas` : `ID ${v.id}`}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
