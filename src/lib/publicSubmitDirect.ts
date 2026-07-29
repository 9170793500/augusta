import { supabase } from './supabase'
import type { EmploymentType, StaffGender } from './types'

type PublicDetailCategory = 'owner' | 'tenant' | 'lease' | 'maid' | 'driver' | 'vehicle'

type PublicContact = {
  apartmentNo: string
  submitterName: string
  submitterMobile: string
  livingAs?: string
}

function str(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function isResidentOwner(details: Record<string, unknown>) {
  const raw = details.is_resident
  if (typeof raw === 'boolean') return raw
  if (raw === 'false' || raw === '0') return false
  return true
}

/** Direct table writes (fallback only). Prefer submit_public_detail RPC. */
export async function submitPublicDetailDirect(
  category: PublicDetailCategory,
  details: Record<string, unknown>,
  contact: PublicContact
) {
  const apartment_no = contact.apartmentNo.trim().toUpperCase()

  switch (category) {
    case 'owner': {
      const full_name = str(details.full_name)
      if (!full_name) throw new Error('Owner full name is required')

      const resident = isResidentOwner(details)
      const occupancy_status = resident ? 'owner_occupied' : 'vacant'

      const { error: flatErr } = await supabase.from('flats').upsert(
        {
          apartment_no,
          owner_name: full_name,
          owner_phone: str(details.mobile) || null,
          owner_email: str(details.email) || null,
          owner_aadhar: str(details.aadhar_number) || null,
          family_members: str(details.family_members) ? Number(details.family_members) : null,
          occupancy_status,
          status: occupancy_status,
        } as never,
        { onConflict: 'apartment_no' }
      )
      if (flatErr) throw flatErr

      if (!resident) return

      const { data: residentRow, error: resErr } = await supabase
        .from('resident_master')
        .insert({
          full_name,
          father_name: str(details.father_name) || null,
          aadhar_number: str(details.aadhar_number) || null,
          pan_number: str(details.pan_number).toUpperCase() || null,
          email: str(details.email) || null,
          mobile: str(details.mobile) || null,
          alt_mobile: str(details.alt_mobile) || null,
        } as never)
        .select('id')
        .single()
      if (resErr) throw resErr

      const { data: existing } = await supabase
        .from('flat_residents')
        .select('id')
        .eq('apartment_no', apartment_no)
        .eq('occupancy_role', 'owner')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await supabase
          .from('flat_residents')
          .update({ resident_id: residentRow.id, is_current: true } as never)
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('flat_residents').insert({
          apartment_no,
          resident_id: residentRow.id,
          occupancy_role: 'owner',
          is_current: true,
        } as never)
        if (error) throw error
      }
      return
    }

    case 'tenant': {
      const full_name = str(details.full_name)
      if (!full_name) throw new Error('Tenant full name is required')

      const { data: resident, error: resErr } = await supabase
        .from('resident_master')
        .insert({
          full_name,
          father_name: str(details.father_name) || null,
          aadhar_number: str(details.aadhar_number) || null,
          pan_number: str(details.pan_number).toUpperCase() || null,
          email: str(details.email) || null,
          mobile: str(details.mobile) || null,
          alt_mobile: str(details.alt_mobile) || null,
        } as never)
        .select('id')
        .single()
      if (resErr) throw resErr

      const { error } = await supabase.from('flat_residents').insert({
        apartment_no,
        resident_id: resident.id,
        occupancy_role: 'tenant',
        is_current: true,
      } as never)
      if (error) throw error

      if (str(details.family_members)) {
        await supabase
          .from('flats')
          .update({ family_members: Number(details.family_members) } as never)
          .eq('apartment_no', apartment_no)
      }
      return
    }

    case 'maid': {
      const name = str(details.name)
      const aadhar_number = str(details.aadhar_number)
      const card_number = str(details.card_number)
      if (!name) throw new Error('Name is required')
      if (!aadhar_number) throw new Error('Aadhar number is required')
      if (!card_number) throw new Error('Card number is required')

      const employment_type: EmploymentType =
        str(details.employment_type) === 'full_time' ? 'full_time' : 'part_time'
      const genderRaw = str(details.gender)
      const gender =
        genderRaw === 'male' || genderRaw === 'female' || genderRaw === 'other'
          ? (genderRaw as StaffGender)
          : null

      const { error } = await supabase.from('maids').insert({
        apartment_no,
        name,
        age: str(details.age) ? Number(details.age) : null,
        gender,
        employment_type,
        aadhar_number,
        mobile: str(details.mobile) || null,
        card_number,
        card_valid_from: str(details.card_valid_from) || null,
        employment_valid_till: str(details.employment_valid_till) || null,
        notes: str(details.notes) || null,
      } as never)
      if (error) throw error
      return
    }

    case 'driver': {
      const driver_name = str(details.driver_name)
      if (!driver_name) throw new Error('Driver name is required')

      const { error } = await supabase.from('drivers').insert({
        apartment_no,
        vehicle_no: str(details.vehicle_no).toUpperCase() || null,
        driver_name,
        mobile: str(details.mobile) || null,
        licence_number: str(details.licence_number) || null,
        licence_valid_from: str(details.licence_valid_from) || null,
        licence_validity: str(details.licence_validity) || null,
        aadhar_number: str(details.aadhar_number) || null,
        address: str(details.address) || null,
        notes: str(details.notes) || null,
      } as never)
      if (error) throw error
      return
    }

    case 'vehicle': {
      const vehicle_no = str(details.vehicle_no).toUpperCase()
      if (!vehicle_no) throw new Error('Vehicle number is required')

      const { error } = await supabase.from('vehicles').insert({
        apartment_no,
        vehicle_no,
        make_model: str(details.make_model) || null,
        colour: str(details.colour) || null,
        linked_to: str(details.linked_to) === 'tenant' ? 'tenant' : 'owner',
        rc_number: str(details.rc_number) || null,
        puc_id: str(details.puc_id) || null,
        puc_validity: str(details.puc_validity) || null,
        parking_slot: str(details.parking_slot) || null,
        driver_name: str(details.driver_name) || null,
        driver_licence: str(details.driver_licence) || null,
      } as never)
      if (error) throw error
      return
    }

    case 'lease': {
      const tenant_name = str(details.tenant_name)
      const lease_start = str(details.lease_start)
      const lease_end = str(details.lease_end)
      if (!tenant_name) throw new Error('Tenant name is required for lease')
      if (!lease_start || !lease_end) throw new Error('Lease start and end dates are required')

      const { error } = await supabase.from('leases').insert({
        apartment_no,
        tenant_name,
        lease_start,
        lease_end,
        status: str(details.status) || 'active',
        notes: str(details.notes) || null,
        document_url: str(details.document_url) || null,
      } as never)
      if (error) throw error
      return
    }
  }
}
