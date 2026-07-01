import { NextResponse } from "next/server";
import { isActiveStatus } from "@/lib/prospects/status";

interface ProspectInput {
  nombre_cliente?: string;
  estatus_general?: string;
  probabilidad_cierre?: number | null;
  monto_total?: number | null;
  apartado_realizado?: boolean;
  proximo_seguimiento?: string | null;
  fecha_apartado?: string | null;
  profiles?: { full_name: string | null } | null;
}

interface RequestBody {
  prospects?: ProspectInput[];
  corte?: string | null;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY no configurada en el entorno." }, { status: 500 });
    }

    const body = (await request.json()) as RequestBody;
    const prospects = Array.isArray(body.prospects) ? body.prospects : [];
    const corte = body.corte || "General";

    const activos = prospects.filter((p) => isActiveStatus(p.estatus_general));

    const compactData = activos.slice(0, 180).map((p) => ({
      cliente: p.nombre_cliente || "Sin nombre",
      asesor: p.profiles?.full_name || "Sin asesor",
      estatus: p.estatus_general || "Sin estatus",
      probabilidad: p.probabilidad_cierre || 0,
      monto: p.monto_total || 0,
      apartado: Boolean(p.apartado_realizado),
      proximoSeguimiento: p.proximo_seguimiento || "Sin fecha",
      fechaApartado: p.fecha_apartado || "Sin fecha",
    }));

    const prompt = [
      "Eres director comercial experto en seguimiento de pipeline inmobiliario.",
      `Genera un analisis ejecutivo para el corte mensual: ${corte}.`,
      "Responde en espanol, maximo 350 palabras.",
      "Usa este formato exacto y ordenado:",
      "1) Resumen ejecutivo",
      "- bullet",
      "- bullet",
      "- bullet",
      "2) Riesgos criticos",
      "- bullet",
      "- bullet",
      "- bullet",
      "3) Oportunidades de cierre",
      "- bullet",
      "- bullet",
      "- bullet",
      "4) Recomendaciones accionables para 7 dias",
      "- bullet con verbo",
      "- bullet con verbo",
      "- bullet con verbo",
      "- bullet con verbo",
      "- bullet con verbo",
      "Usa tono profesional, concreto y sin relleno.",
      "Data de seguimientos activos en JSON:",
      JSON.stringify(compactData),
    ].join("\n");

    const deepseekResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Eres un analista comercial senior orientado a direccion." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 900,
      }),
    });

    if (!deepseekResponse.ok) {
      const detail = await deepseekResponse.text();
      return NextResponse.json({ error: `DeepSeek error: ${detail}` }, { status: 502 });
    }

    const json = await deepseekResponse.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const summary = json.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return NextResponse.json({ error: "No se obtuvo contenido de DeepSeek." }, { status: 502 });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado al generar analisis IA." },
      { status: 500 }
    );
  }
}
