"use client";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="card text-center">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">
          UniOps DB
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Campus Operations Suite — RDBMS + MongoDB
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left">
          {[
            { title: "Students", desc: "Register & manage students", href: "/students", icon: "👨‍🎓" },
            { title: "Courses", desc: "Browse & enroll in courses", href: "/courses", icon: "📚" },
            { title: "Library", desc: "Issue & return books", href: "/library", icon: "📖" },
            { title: "Bookings", desc: "Room & event scheduling", href: "/bookings", icon: "🏛️" },
            { title: "Tickets", desc: "Helpdesk complaints (MongoDB)", href: "/tickets", icon: "🎫" },
            { title: "Payments", desc: "View payment records", href: "/payments", icon: "💰" },
          ].map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="card hover:border-indigo-400 transition-colors"
            >
              <div className="text-2xl mb-2">{m.icon}</div>
              <h3 className="font-semibold text-indigo-700">{m.title}</h3>
              <p className="text-sm text-gray-500">{m.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
