import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { createCuNoRealizado } from '../api/cuApi'
import { todayISO } from '../utils/dates'

const CuNoRealizadoCreatePage = () => {
  const [fecha, setFecha] = useState(todayISO())
  const [tecnico, setTecnico] = useState('')
  const [motivo, setMotivo] = useState('')
  const [cliente, setCliente] = useState('')
  const [direccion, setDireccion] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const mutation = useMutation({
    mutationFn: createCuNoRealizado,
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    mutation.mutate({
      fecha,
      tecnico,
      motivo,
      cliente,
      direccion,
      descripcion,
    })
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Registrar CU no realizado</h2>
        <p className="text-sm text-slate-500">Completa los datos del cargo usuario pendiente.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <FormCard title="Datos del CU" description="Información requerida para el registro.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fecha">
              <input className="input-base" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
            </Field>
            <Field label="Técnico">
              <input className="input-base" value={tecnico} onChange={(event) => setTecnico(event.target.value)} />
            </Field>
            <Field label="Motivo">
              <input className="input-base" value={motivo} onChange={(event) => setMotivo(event.target.value)} />
            </Field>
            <Field label="Cliente">
              <input className="input-base" value={cliente} onChange={(event) => setCliente(event.target.value)} />
            </Field>
            <Field label="Dirección">
              <input className="input-base" value={direccion} onChange={(event) => setDireccion(event.target.value)} />
            </Field>
            <Field label="Descripción">
              <textarea
                className="input-base h-24 resize-none"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Registrando...' : 'Guardar CU'}
            </Button>
          </div>
          {mutation.isSuccess ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
              CU registrado correctamente.
            </div>
          ) : null}
        </FormCard>
      </form>
    </div>
  )
}

export default CuNoRealizadoCreatePage
