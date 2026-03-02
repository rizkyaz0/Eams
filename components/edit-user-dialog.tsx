"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user: any;
}

export function EditUserDialog({ open, onOpenChange, onSuccess, user }: EditUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<any[]>([]);
  const { toast } = useToast();

  // Form state
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [nip, setNip] = useState("");
  const [role, setRole] = useState("");
  const [divisionId, setDivisionId] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setNip(user.nip || "");
      setRole(user.role || "EMPLOYEE");
      setDivisionId(user.divisionId || user.division?.id || "");
    }
  }, [user]);

  // Fetch divisions
  useEffect(() => {
    if (open) {
      fetchDivisions();
    }
  }, [open]);

  const fetchDivisions = async () => {
    try {
      const response = await fetch("/api/divisions");
      const data = await response.json();
      if (data.success) {
        setDivisions(data.data.divisions || []);
      }
    } catch (error) {
      console.error("Failed to fetch divisions:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body: any = {
        fullName,
        nip: nip || null,
        role,
        divisionId: divisionId || null,
      };

      if (password) {
        body.password = password;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details. Leave password blank to keep unchanged.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">New Password (Optional)</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nip">NIP</Label>
              <Input id="nip" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Employee ID" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="ADMIN_INSTANSI">Admin Instansi</SelectItem>
                    <SelectItem value="STAFF_ASSET">Staff Asset</SelectItem>
                    <SelectItem value="TEKNISI">Teknisi</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="division">Division</Label>
                <Select value={divisionId} onValueChange={setDivisionId}>
                  <SelectTrigger id="division">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((div) => (
                      <SelectItem key={div.id} value={div.id}>
                        {div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
