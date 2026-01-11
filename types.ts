
// Priority enum for maintenance complaints classification
export enum Priority {
  LOW = 'Rendah',
  MEDIUM = 'Sedang',
  HIGH = 'Tinggi',
  CRITICAL = 'Kritis'
}

export interface MaintenanceRecord {
  id: string;
  roomName: string;      // Kolom A: Nama Ruangan
  itemName: string;      // Kolom B: Nama Item
  complaintType: string; // Kolom C: Jenis Komplain
  complaintDate: string; // Kolom D: Tanggal Komplain
  status: string;        // Kolom E: Status Perbaikan
  repairDate: string;    // Kolom F: Tanggal Perbaikan
  obstaclesHeader: string; // Kolom G: KENDALA (dari header asli)
  obstaclesMain: string;   // Kolom H: HAMBATAN (Sumber utama analisis kendala)
  technicianNotes: string; // Kolom I: CATATAN/TEKNISI
}
