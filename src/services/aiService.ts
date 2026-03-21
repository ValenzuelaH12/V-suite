import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface AIAnalysisResult {
  diagnostico: string;
  sugerencia: string;
  departamento: string;
  materiales_sugeridos: string[];
}

export const aiService = {
  /**
   * Analiza una imagen de una incidencia para sugerir diagnósticos y materiales.
   */
  async analyzeIncidentImage(imageUrl: string, title: string): Promise<AIAnalysisResult> {
    if (!API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY no encontrada en las variables de entorno.");
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Fallo al descargar la imagen: ${response.statusText}`);
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      
      const base64Data = await base64Promise;

      const prompt = `
        Analiza esta foto de una avería en un hotel titulada "${title}". 
        Tu objetivo es ayudar al técnico de mantenimiento.
        Genera una respuesta en formato JSON estrictamente con esta estructura:
        {
          "diagnostico": "breve descripción de lo que ves",
          "sugerencia": "pasos recomendados para arreglarlo",
          "departamento": "Mantenimiento / IT / Pisos / Recepción",
          "materiales_sugeridos": ["material 1", "material 2"]
        }
      `;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: blob.type
          }
        }
      ]);

      const text = result.response.text();
      const jsonStr = text.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr) as AIAnalysisResult;
    } catch (error: any) {
      console.error("❌ ERROR EN AI SERVICE:", error);
      throw new Error(`Error en el motor de IA: ${error.message}`);
    }
  },

  /**
   * Detecta anomalías en las lecturas de suministros.
   */
  async detectAnomalies(readings: any[]): Promise<string | null> {
    if (!API_KEY || readings.length < 3) return null;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Analiza estas lecturas de consumos de hotel y detecta si hay alguna anomalía evidente (picos de consumo injustificados, posibles fugas).
        Lecturas: ${JSON.stringify(readings)}
        Responde brevemente con el problema detectado o "OK" si todo es normal.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return response.trim().toUpperCase().includes("OK") ? null : response;
    } catch (error) {
      return null;
    }
  },

  /**
   * Analiza patrones de fallos en zonas para detectar problemas sistémicos.
   */
  async analyzeIncidentTrends(incidents: any[]): Promise<string | null> {
    if (!API_KEY || incidents.length < 5) return null;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Como experto en mantenimiento hotelero y analista de datos, revisa estos reportes de incidencias recientes:
        ${JSON.stringify(incidents.map(i => ({ t: i.title, l: i.location, d: i.description })))}

        ¿Notas algún patrón preocupante? (ej: "La zona X tiene muchos fallos de aire acondicionado", "Hay reportes repetidos de fugas en la planta 2").
        Si detectas algo crítico que requiera atención inmediata de Gerencia, respóndeme con un mensaje de alerta corto y directo. 
        Si no hay patrones claros, responde estrictamente "OK".
      `;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return response.trim().toUpperCase() === "OK" ? null : response;
    } catch (error) {
      console.error("Error en análisis de tendencias AI:", error);
      return null;
    }
  }
};
