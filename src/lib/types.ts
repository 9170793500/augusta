export type AppRole = 'admin' | 'owner' | 'tenant'
export type EmploymentType = 'full_time' | 'part_time'
export type StaffGender = 'male' | 'female' | 'other'
export type SecurityEmployeeType =
  | 'security_guard'
  | 'gardener'
  | 'cleaner'
  | 'technician'
  | 'other'
export type ShiftType = 'day' | 'night' | 'rotational'
export type RfidStatus = 'active' | 'blocked' | 'expired' | 'lost'
export type RfidHolderType = 'vehicle'
export type LeaseStatus = 'active' | 'expired' | 'renewed'
export type OccupancyRole = 'owner' | 'tenant'
export type LinkedTo = OccupancyRole
export type DocumentType =
  | 'owner_aadhar'
  | 'tenant_aadhar'
  | 'tenant_pan'
  | 'lease_copy'
  | 'maid_aadhar'
  | 'maid_photo'
  | 'security_aadhar'
  | 'security_photo'
  | 'vehicle_rc'
  | 'vehicle_licence'
  | 'vehicle_puc'
  | 'other'

export type Profile = {
  id: string
  full_name: string
  email: string | null
  role: AppRole
  apartment_no: string | null
  phone: string | null
  created_at: string
}

export type ResidentMaster = {
  id: string
  full_name: string
  father_name: string | null
  aadhar_number: string | null
  pan_number: string | null
  email: string | null
  mobile: string | null
  alt_mobile: string | null
  notes: string | null
  created_at: string
}

export type FlatResident = {
  id: string
  apartment_no: string
  resident_id: string
  occupancy_role: OccupancyRole
  is_current: boolean
  move_in_date: string | null
  move_out_date: string | null
  notes: string | null
  created_at: string
}

export type Flat = {
  id: string
  apartment_no: string
  tower: string | null
  floor: string | null
  owner_name: string | null
  owner_phone: string | null
  owner_email: string | null
  owner_aadhar: string | null
  tenant_name: string | null
  tenant_phone: string | null
  tenant_email: string | null
  tenant_aadhar: string | null
  tenant_pan: string | null
  family_members: number | null
  occupancy_status: string | null
  status: string | null
  created_at: string
}

export type Lease = {
  id: string
  apartment_no: string
  tenant_name: string
  lease_start: string
  lease_end: string
  status: LeaseStatus
  document_url: string | null
  notes: string | null
  created_at: string
}

export type Vehicle = {
  id: string
  apartment_no: string
  vehicle_no: string
  make_model: string | null
  colour: string | null
  linked_to: LinkedTo | null
  driver_name: string | null
  driver_licence: string | null
  driver_licence_validity: string | null
  rc_number: string | null
  puc_id: string | null
  puc_validity: string | null
  parking_slot: string | null
  extra_parking: boolean | null
  notes: string | null
  created_at: string
}

export type RfidCard = {
  id: string
  sr_no: number | null
  apartment_no: string
  vehicle_no: string | null
  rfid_no: string
  holder_type: RfidHolderType | null
  holder_name: string | null
  status: RfidStatus
  valid_till: string | null
  notes: string | null
  created_at: string
}

export type Driver = {
  id: string
  apartment_no: string
  vehicle_no: string | null
  driver_name: string
  mobile: string | null
  licence_number: string | null
  licence_validity: string | null
  aadhar_number: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type Maid = {
  id: string
  apartment_no: string
  name: string
  age: number | null
  gender: StaffGender | null
  employment_type: EmploymentType
  aadhar_number: string
  mobile: string | null
  card_number: string | null
  employment_valid_till: string | null
  notes: string | null
  created_at: string
}

export type SecurityStaff = {
  id: string
  employee_type: SecurityEmployeeType
  name: string
  mobile: string
  aadhar_number: string | null
  employee_id: string | null
  shift: ShiftType | null
  rfid_no: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type ParkingAmenity = {
  id: string
  apartment_no: string
  parking_slot: string | null
  extra_parking: boolean | null
  extra_parking_charge: number | null
  gym_access: boolean | null
  gym_valid_till: string | null
  notes: string | null
  created_at: string
}

export type MaintenanceDue = {
  id: string
  apartment_no: string
  year: number
  annual_amount: number
  paid_amount: number
  pending_amount: number | null
  payment_date: string | null
  payment_mode: string | null
  receipt_no: string | null
  notes: string | null
  created_at: string
}

export type NocCharge = {
  id: string
  apartment_no: string
  tenant_name: string
  amount: number
  charge_type: string | null
  paid: boolean | null
  payment_date: string | null
  receipt_no: string | null
  notes: string | null
  created_at: string
}

export type KycDocument = {
  id: string
  apartment_no: string | null
  document_type: DocumentType
  holder_name: string | null
  reference_no: string | null
  file_url: string | null
  valid_till: string | null
  notes: string | null
  created_at: string
}

export type Alert = {
  id: string
  apartment_no: string | null
  alert_type: string
  message: string
  due_date: string | null
  is_read: boolean | null
  created_at: string
}

export type TabId =
  | 'overview'
  | 'owner'
  | 'residents'
  | 'leases'
  | 'vehicles'
  | 'rfid'
  | 'driver'
  | 'maid'
  | 'security'
  | 'parking'
  | 'dues'
  | 'noc'
  | 'documents'
  | 'reports'
  | 'users'

export type FormProps = {
  onSaved: () => void
  apartmentNo: string | null
  lockApartment: boolean
  isAdmin: boolean
  readOnly?: boolean
}
