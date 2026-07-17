async function test() {
  try {
    const res = await fetch("http://127.0.0.1:8080/api/reuniones");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const r620 = data.find(r => r.id_reunion === 620);
    const r619 = data.find(r => r.id_reunion === 619);
    console.log("R620:", r620);
    console.log("R619:", r619);
  } catch(e) {
    console.error(e.message);
  }
}
test();
