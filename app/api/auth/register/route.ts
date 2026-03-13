// app/api/auth/register/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, nip, email, password, confirmPassword } = body;

    // Validasi input
    if (!fullName || !email || !password) {
      return errorResponse("Nama lengkap, email, dan password wajib diisi");
    }

    if (password !== confirmPassword) {
      return errorResponse("Password dan konfirmasi password tidak cocok");
    }

    if (password.length < 8) {
      return errorResponse("Password minimal 8 karakter");
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse("Format email tidak valid");
    }

    // Cek apakah email sudah dipakai
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse("Email sudah digunakan", 409);
    }

    // Cek NIP jika diisi
    if (nip) {
      const existingNip = await db.user.findUnique({ where: { nip } });
      if (existingNip) {
        return errorResponse("NIP sudah digunakan", 409);
      }
    }

    // Buat user baru dengan role EMPLOYEE (tidak bisa pilih role sendiri)
    const hashedPassword = await hashPassword(password);
    const newUser = await db.user.create({
      data: {
        fullName,
        email,
        nip: nip || null,
        password: hashedPassword,
        role: "EMPLOYEE", // Register selalu EMPLOYEE
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        nip: true,
        role: true,
      },
    });

    return successResponse(newUser, "Registrasi berhasil! Silakan login.", 201);
  } catch (error: any) {
    console.error("Register error:", error);
    return errorResponse(error.message || "Gagal mendaftar", 500);
  }
}
