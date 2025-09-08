import { NextResponse } from "next/server";
import { db } from "../../lib/firebase-client";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  try {
    // Simulate user validation (replace with your auth logic)
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/validate?role=${role}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.error || "Unauthorized access" }, { status: 401 });
    }

    const userData = await response.json();
    if (!userData.email || userData.role !== "owner") {
      return NextResponse.json({ error: "User is not an owner" }, { status: 403 });
    }

    // Fetch seat arrangements
    const q = query(collection(db, "seatArrangements"), where("userEmail", "==", userData.email));
    const querySnapshot = await getDocs(q);
    let arrangement = null;

    if (!querySnapshot.empty) {
      arrangement = {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data(),
        seats: querySnapshot.docs[0].data().seats.map((seat: any) => ({
          ...seat,
          id: seat.id || `seat-${Math.random().toString(36).substr(2, 9)}`,
          number: Number(seat.number) || 0,
          row: Number(seat.row) || 0,
          col: Number(seat.col) || 0,
          x: Number(seat.x) || undefined,
          y: Number(seat.y) || undefined,
          reserved: seat.reserved ?? false,
        })),
        reservedSeatsCount: querySnapshot.docs[0].data().seats.filter((seat: any) => seat.reserved).length,
      };
    }

    return NextResponse.json({
      user: { email: userData.email, role: userData.role },
      arrangement,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}