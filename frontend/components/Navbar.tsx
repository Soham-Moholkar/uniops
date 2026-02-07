"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuth } from "@/lib/api";

const links = [
  { href: "/students", label: "Students" },
  { href: "/courses", label: "Courses" },
  { href: "/library", label: "Library" },
  { href: "/bookings", label: "Bookings" },
  { href: "/tickets", label: "Tickets" },
  { href: "/payments", label: "Payments" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("token"));
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <nav className="bg-indigo-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="font-bold text-lg tracking-wide">
            UniOps DB
          </Link>
          <div className="flex items-center gap-1">
            {loggedIn &&
              links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    pathname === l.href
                      ? "bg-indigo-900"
                      : "hover:bg-indigo-600"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            {loggedIn ? (
              <button
                onClick={handleLogout}
                className="ml-4 px-3 py-1.5 rounded text-sm bg-indigo-800 hover:bg-indigo-900"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded text-sm bg-indigo-800 hover:bg-indigo-900"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
