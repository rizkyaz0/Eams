"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [fullName, setFullName]   = useState("");
  const [username, setUsername]   = useState("");
  const [email, setEmail]         = useState("");
  const [lembaga, setLembaga]     = useState("");
  const [password, setPassword]   = useState("");
  const [nip, setNip]             = useState("");
  const [role, setRole]           = useState("EMPLOYEE");
  const [divisionId, setDivisionId] = useState("");

  useEffect(() => {
    if (open) fetchDivisions();
  }, [open]);

  const fetchDivisions = async () => {
    try {
      const response = await fetch("/api/divisions");
      const data = await response.json();
      if (data.success) {
        setDivisions(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch divisions:", error);
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pwd);
    setShowPassword(true);
    toast.success("Password digenerate! Salin sebelum menyimpan.");
  };

  const resetForm = () => {
    setFullName(""); setUsername(""); setEmail(""); setLembaga("");
    setPassword(""); setNip(""); setRole("EMPLOYEE"); setDivisionId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          username: username || null,
          email,
          lembaga: lembaga || null,
          password,
          nip: nip || null,
          role,
          divisionId: divisionId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat user");
      }

      toast.success("User berhasil dibuat!");
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>Buat akun pengguna baru untuk sistem.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">

            {/* Nama Lengkap */}
            <div className="grid gap-2">
              <Label htmlFor="cu-fullName">Nama Lengkap *</Label>
              <Input id="cu-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Budi Santoso" required />
            </div>

            {/* Username */}
            <div className="grid gap-2">
              <Label htmlFor="cu-username">
                Username * <span className="text-xs text-muted-foreground">(digunakan untuk login)</span>
              </Label>
              <Input id="cu-username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))} placeholder="budi_santoso" required />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="cu-email">Email *</Label>
              <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="budi@instansi.go.id" required />
            </div>

            {/* Lembaga/Unit */}
            <div className="grid gap-2">
              <Label htmlFor="cu-lembaga">
                Unit / Lembaga <span className="text-xs text-muted-foreground">(tampil di tanda tangan BAST)</span>
              </Label>
              <Input id="cu-lembaga" value={lembaga} onChange={(e) => setLembaga(e.target.value)} placeholder="Unit Logistik dan Aset" />
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cu-password">Password *</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={generateRandomPassword}>
                  <RefreshCw className="size-3 mr-1" /> Generate
                </Button>
              </div>
              <div className="relative">
                <Input id="cu-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-9" placeholder="Min. 8 karakter" />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* NIP */}
            <div className="grid gap-2">
              <Label htmlFor="cu-nip">NIP <span className="text-xs text-muted-foreground">(opsional)</span></Label>
              <Input id="cu-nip" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="198001012010011001" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Role */}
              <div className="grid gap-2">
                <Label htmlFor="cu-role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="cu-role"><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="ADMIN_INSTANSI">Admin Instansi</SelectItem>
                    <SelectItem value="STAFF_ASSET">Staff Asset</SelectItem>
                    <SelectItem value="TEKNISI">Teknisi</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Divisi */}
              <div className="grid gap-2">
                <Label htmlFor="cu-division">Divisi</Label>
                <Select value={divisionId} onValueChange={setDivisionId}>
                  <SelectTrigger id="cu-division"><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                  <SelectContent>
                    {divisions.map((div) => (
                      <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Pengguna
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
