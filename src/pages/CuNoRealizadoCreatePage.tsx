import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import PageLayout from '../components/common/PageLayout'
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
    <PageLayout title="Registrar CU no realizado" subtitle="Completa los datos del cargo usuario pendiente.">

      <form onSubmit={handleSubmit}>
        <FormCard title="Datos del CU" description="Información requerida para el registro.">
          <div className="grid gap-2 md:grid-cols-2">
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
                className="input-base h-16 resize-none"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Registrando...' : 'Guardar CU'}
            </Button>
          </div>
          {mutation.isSuccess ? (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-600">
              CU registrado correctamente.
            </div>
          ) : null}
        </FormCard>
      </form>
    </PageLayout>
  )
}

export default CuNoRealizadoCreatePage
