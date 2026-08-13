import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  ImageOff,
  ImagePlus,
  Link2,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  Tag,
  Target,
  Trash2,
  Users,
  Utensils,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Checkbox from '../../components/ui/Checkbox';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const TABS = [
  { value: 'productos', label: 'Productos', icon: Package },
  { value: 'categorias', label: 'Categorías', icon: Tag },
  { value: 'acompanamientos', label: 'Acompañamientos', icon: Utensils },
  { value: 'destinos', label: 'Destinos', icon: Target },
  { value: 'cajeras', label: 'Cajeras', icon: Users },
];

const CATEGORIAS_ACOMP = ['Bebida', 'Comida', 'Extra', 'Endulzante', 'Otro'];

const NOMBRE_SINGULAR = {
  productos: 'producto',
  categorias: 'categoría',
  acompanamientos: 'acompañamiento',
  destinos: 'destino',
  cajeras: 'cajera',
};

const formVacio = {
  nombre: '',
  descripcion: '',
  precio: '',
  stock: '',
  categoria_id: '',
  destino_id: '',
  categoria: 'Bebida',
  producto_vinculado_id: '',
  usuario: '',
  password: '',
  acompanamientos_ids: [],
};

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('productos');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(formVacio);
  const [guardando, setGuardando] = useState(false);

  const [auxCats, setAuxCats] = useState([]);
  const [auxDest, setAuxDest] = useState([]);
  const [auxAcomp, setAuxAcomp] = useState([]);
  const [listaProductos, setListaProductos] = useState([]);
  const [filtroAcomp, setFiltroAcomp] = useState('');

  const [nuevoAcompNombre, setNuevoAcompNombre] = useState('');
  const [nuevoAcompCategoria, setNuevoAcompCategoria] = useState('Bebida');
  const [creandoAcomp, setCreandoAcomp] = useState(false);

  const [generandoImagen, setGenerandoImagen] = useState(false);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe recargar cuando cambia la pestaña
  }, [activeTab]);

  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'cajeras' ? '/auth/cajeras' : activeTab === 'productos' ? '/productos' : `/${activeTab}`;
      const { data: res } = await api.get(url);

      if (activeTab === 'productos') setData(res.productos || []);
      else if (activeTab === 'cajeras') setData(res.cajeras || []);
      else setData(res || []);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando los datos.');
    } finally {
      setLoading(false);
    }
  };

  const cargarAuxiliares = async () => {
    try {
      const [resCat, resDest, resAcomp, resProd] = await Promise.all([
        api.get('/categorias'),
        api.get('/destinos'),
        api.get('/acompanamientos'),
        api.get('/productos'),
      ]);
      setAuxCats(resCat.data);
      setAuxDest(resDest.data);
      setAuxAcomp(resAcomp.data);
      setListaProductos(resProd.data.productos || []);
    } catch (err) {
      console.error('Error cargando auxiliares:', err);
    }
  };

  const handleQuickCreateAcomp = async (e) => {
    e.preventDefault();
    if (!nuevoAcompNombre.trim()) return;
    setCreandoAcomp(true);
    try {
      const { data: res } = await api.post('/acompanamientos', {
        nombre: nuevoAcompNombre,
        categoria: nuevoAcompCategoria,
        stock: 50,
      });
      const nuevoItem = { id: res.id, nombre: nuevoAcompNombre, categoria: nuevoAcompCategoria, stock: 50 };
      setAuxAcomp((prev) => [...prev, nuevoItem]);
      setForm((prev) => ({ ...prev, acompanamientos_ids: [...prev.acompanamientos_ids, nuevoItem.id] }));
      setNuevoAcompNombre('');
      toast.success('Opción creada.');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo crear la opción.');
    } finally {
      setCreandoAcomp(false);
    }
  };

  const construirPayload = () => {
    if (activeTab === 'productos') {
      return {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio: form.precio,
        stock: form.stock,
        categoria_id: form.categoria_id,
        destino_id: form.destino_id,
        acompanamientos_ids: form.acompanamientos_ids,
      };
    }
    if (activeTab === 'acompanamientos') {
      const payload = {
        nombre: form.nombre,
        categoria: form.categoria,
        producto_vinculado_id: form.producto_vinculado_id || null,
      };
      // Igual que en un <input disabled>: si hay producto vinculado no se manda stock manual
      if (!form.producto_vinculado_id) payload.stock = form.stock;
      return payload;
    }
    if (activeTab === 'cajeras') {
      return { nombre: form.nombre, usuario: form.usuario, password: form.password };
    }
    // categorias / destinos
    return { nombre: form.nombre };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const payload = construirPayload();
      if (activeTab === 'cajeras') {
        await api.post('/auth/registro', payload);
      } else if (editingItem?.id) {
        await api.put(`/${activeTab}/${editingItem.id}`, payload);
      } else {
        await api.post(`/${activeTab}`, payload);
      }
      toast.success('Guardado correctamente.');
      setShowModal(false);
      cargarDatos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (id) => {
    if (activeTab === 'cajeras') {
      toast.warning('No se pueden eliminar cajeras desde acá.');
      return;
    }
    const ok = await toast.confirm('¿Seguro que querés eliminar este elemento?', { title: 'Eliminar', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await api.delete(`/${activeTab}/${id}`);
      cargarDatos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
    }
  };

  const openModal = async (item = null) => {
    if (activeTab === 'cajeras' && item) {
      toast.warning('La edición de usuarios no está disponible.');
      return;
    }

    if (activeTab !== 'cajeras') await cargarAuxiliares();

    setEditingItem(item || {});
    setForm({
      ...formVacio,
      nombre: item?.nombre || '',
      descripcion: item?.descripcion || '',
      precio: item?.precio ?? '',
      stock: item?.stock ?? '',
      categoria_id: item?.categoria_id ?? '',
      destino_id: item?.destino_id ?? '',
      categoria: item?.categoria || 'Bebida',
      producto_vinculado_id: item?.producto_vinculado_id || '',
      acompanamientos_ids: item?.acompanamientos?.map((a) => a.id) || [],
    });
    setFiltroAcomp('');
    setShowModal(true);
  };

  const toggleAcompanamiento = (id) => {
    setForm((prev) => ({
      ...prev,
      acompanamientos_ids: prev.acompanamientos_ids.includes(id)
        ? prev.acompanamientos_ids.filter((x) => x !== id)
        : [...prev.acompanamientos_ids, id],
    }));
  };

  const handleGenerarImagen = async () => {
    if (!editingItem?.id) return;
    setGenerandoImagen(true);
    try {
      const { data: res } = await api.post(`/productos/${editingItem.id}/generar-imagen`);
      setEditingItem((prev) => ({ ...prev, imagen_url: res.imagen_url }));
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo generar la imagen.');
    } finally {
      setGenerandoImagen(false);
    }
  };

  const columnas = columnasPara(activeTab);

  return (
    <div className="min-h-screen bg-cream-100 pb-10">
      <header className="border-b border-cream-300 bg-cream-50 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            icon={Settings}
            title="Panel de administración"
            actions={
              <Button variant="secondary" icon={ArrowLeft} onClick={() => setLocation('/pedidos')}>
                Volver a caja
              </Button>
            }
          />
          <div className="mt-4">
            <Tabs items={TABS} value={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold capitalize text-coffee-900">Gestionar {activeTab}</h2>
          <Button icon={Plus} onClick={() => openModal()}>
            Nuevo
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <Table
            columns={columnas}
            data={data}
            emptyState={<EmptyState icon={Package} title={`No hay ${activeTab} cargados`} />}
            renderActions={
              activeTab === 'cajeras'
                ? undefined
                : (item) => (
                    <>
                      <IconButton label="Editar" size="sm" variant="ghost" onClick={() => openModal(item)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Eliminar" size="sm" variant="danger" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </>
                  )
            }
          />
        )}
      </main>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`${editingItem?.id ? 'Editar' : 'Crear'} ${NOMBRE_SINGULAR[activeTab]}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="admin-form" loading={guardando} icon={guardando ? undefined : Save}>
              Guardar
            </Button>
          </div>
        }
      >
        <form id="admin-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Input label="Nombre" value={form.nombre} onChange={(e) => setField('nombre')(e.target.value)} required autoFocus />

          {activeTab === 'productos' && (
            <ProductoCampos
              form={form}
              setField={setField}
              auxCats={auxCats}
              auxDest={auxDest}
              auxAcomp={auxAcomp}
              filtroAcomp={filtroAcomp}
              setFiltroAcomp={setFiltroAcomp}
              toggleAcompanamiento={toggleAcompanamiento}
              editingItem={editingItem}
              generandoImagen={generandoImagen}
              onGenerarImagen={handleGenerarImagen}
              nuevoAcompNombre={nuevoAcompNombre}
              setNuevoAcompNombre={setNuevoAcompNombre}
              nuevoAcompCategoria={nuevoAcompCategoria}
              setNuevoAcompCategoria={setNuevoAcompCategoria}
              creandoAcomp={creandoAcomp}
              onQuickCreateAcomp={handleQuickCreateAcomp}
            />
          )}

          {activeTab === 'acompanamientos' && (
            <AcompanamientoCampos form={form} setField={setField} listaProductos={listaProductos} />
          )}

          {activeTab === 'cajeras' && (
            <>
              <Input label="Usuario" value={form.usuario} onChange={(e) => setField('usuario')(e.target.value)} required />
              <Input
                label="Contraseña"
                type="password"
                value={form.password}
                onChange={(e) => setField('password')(e.target.value)}
                required
                minLength={6}
                hint="Mínimo 6 caracteres."
              />
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}

function ProductoCampos({
  form,
  setField,
  auxCats,
  auxDest,
  auxAcomp,
  filtroAcomp,
  setFiltroAcomp,
  toggleAcompanamiento,
  editingItem,
  generandoImagen,
  onGenerarImagen,
  nuevoAcompNombre,
  setNuevoAcompNombre,
  nuevoAcompCategoria,
  setNuevoAcompCategoria,
  creandoAcomp,
  onQuickCreateAcomp,
}) {
  const acompFiltrados = auxAcomp.filter((ac) => ac.nombre.toLowerCase().includes(filtroAcomp.toLowerCase()));

  return (
    <>
      <Textarea label="Descripción" value={form.descripcion} onChange={(e) => setField('descripcion')(e.target.value)} rows={3} />

      <div>
        <p className="mb-1.5 text-sm font-semibold text-coffee-700">Imagen del producto (generada con IA)</p>
        {editingItem?.id ? (
          <div className="flex flex-col gap-2">
            {editingItem?.imagen_url ? (
              <img src={editingItem.imagen_url} alt="Vista previa" className="h-32 w-32 rounded-xl object-cover" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-cream-200 text-coffee-400">
                <ImageOff className="h-8 w-8" aria-hidden="true" />
              </div>
            )}
            <p className="text-xs text-coffee-400">Se genera automáticamente a partir del nombre y la descripción.</p>
            <Button type="button" variant="secondary" size="sm" loading={generandoImagen} icon={generandoImagen ? undefined : ImagePlus} onClick={onGenerarImagen} className="self-start">
              {editingItem?.imagen_url ? 'Regenerar imagen' : 'Generar imagen'}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-coffee-400">Guardá el producto primero; después podés generarle una imagen desde &quot;Editar&quot;.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Precio" type="number" step="0.01" value={form.precio} onChange={(e) => setField('precio')(e.target.value)} required />
        <Input label="Stock" type="number" value={form.stock} onChange={(e) => setField('stock')(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Categoría" value={form.categoria_id} onChange={(e) => setField('categoria_id')(e.target.value)} required>
          <option value="">-- Seleccionar --</option>
          {auxCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
        <Select label="Destino" value={form.destino_id} onChange={(e) => setField('destino_id')(e.target.value)} required>
          <option value="">-- Seleccionar --</option>
          {auxDest.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-2xl border border-cream-300 bg-cream-50 p-4">
        <p className="mb-2 text-sm font-semibold text-coffee-700">Opciones / acompañamientos</p>
        <Input
          value={filtroAcomp}
          onChange={(e) => setFiltroAcomp(e.target.value)}
          placeholder="Buscar..."
          icon={Search}
          wrapperClassName="mb-3"
        />
        <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {acompFiltrados.map((ac) => (
            <Checkbox
              key={ac.id}
              label={ac.nombre}
              description={`Stock: ${ac.stock}`}
              checked={form.acompanamientos_ids.includes(ac.id)}
              onChange={() => toggleAcompanamiento(ac.id)}
            />
          ))}
          {acompFiltrados.length === 0 && <p className="text-xs text-coffee-400">Sin resultados.</p>}
        </div>

        <div className="mt-3 border-t border-dashed border-cream-400 pt-3">
          <p className="mb-2 text-xs text-coffee-500">¿No encontrás la opción? Creala rápido:</p>
          <div className="flex gap-2">
            <Input
              value={nuevoAcompNombre}
              onChange={(e) => setNuevoAcompNombre(e.target.value)}
              placeholder="Nombre (ej: Hielo)"
              wrapperClassName="flex-1"
            />
            <Select value={nuevoAcompCategoria} onChange={(e) => setNuevoAcompCategoria(e.target.value)} wrapperClassName="w-32">
              {CATEGORIAS_ACOMP.slice(0, 3).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Button type="button" variant="secondary" size="sm" loading={creandoAcomp} disabled={!nuevoAcompNombre.trim()} icon={creandoAcomp ? undefined : Sparkles} onClick={onQuickCreateAcomp}>
              Crear
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function AcompanamientoCampos({ form, setField, listaProductos }) {
  const vinculado = !!form.producto_vinculado_id;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Categoría" value={form.categoria} onChange={(e) => setField('categoria')(e.target.value)} required>
          {CATEGORIAS_ACOMP.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          label="Vincular stock (opcional)"
          value={form.producto_vinculado_id}
          onChange={(e) => setField('producto_vinculado_id')(e.target.value)}
          icon={Link2}
          hint="Si vinculás, se descuenta del stock del producto elegido."
        >
          <option value="">-- Sin vincular (stock propio) --</option>
          {listaProductos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} (Stock: {p.stock})
            </option>
          ))}
        </Select>
      </div>

      <Input
        label="Stock manual"
        type="number"
        value={vinculado ? '' : form.stock}
        onChange={(e) => setField('stock')(e.target.value)}
        disabled={vinculado}
        hint={vinculado ? 'Deshabilitado: el stock se toma del producto vinculado.' : undefined}
      />
    </>
  );
}

function columnasPara(activeTab) {
  const info = {
    key: 'info',
    header: 'Información',
    cardLabel: false,
    render: (item) => (
      <div className="flex items-center gap-3">
        {activeTab === 'productos' &&
          (item.imagen_url ? (
            <img src={item.imagen_url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-coffee-400">
              <ImageOff className="h-4 w-4" aria-hidden="true" />
            </div>
          ))}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-bold text-coffee-900">
            {item.nombre}
            {item.producto_vinculado_id && (
              <Badge variant="gold" size="sm" icon={Link2}>
                vinculado
              </Badge>
            )}
          </p>
          {item.descripcion && <p className="line-clamp-1 text-xs text-coffee-500">{item.descripcion}</p>}
        </div>
      </div>
    ),
  };

  if (activeTab === 'productos') {
    return [
      info,
      {
        key: 'precio',
        header: 'Precio / Stock',
        render: (item) => (
          <div className="flex flex-col">
            <span className="font-bold text-coffee-800">${item.precio}</span>
            <span className={item.stock < 5 ? 'text-xs font-semibold text-warning-600' : 'text-xs text-coffee-400'}>Stock: {item.stock}</span>
          </div>
        ),
      },
      { key: 'categoria', header: 'Categoría', render: (item) => item.categoria_nombre },
    ];
  }

  if (activeTab === 'acompanamientos') {
    return [
      info,
      { key: 'categoria', header: 'Categoría', render: (item) => item.categoria },
      {
        key: 'stock',
        header: 'Stock',
        render: (item) => (
          <span className={item.stock < 10 ? 'font-semibold text-warning-600' : 'text-coffee-700'}>{item.stock} u.</span>
        ),
      },
    ];
  }

  if (activeTab === 'cajeras') {
    return [info, { key: 'usuario', header: 'Usuario', render: (item) => <span className="text-coffee-500">@{item.usuario}</span> }];
  }

  return [info];
}
