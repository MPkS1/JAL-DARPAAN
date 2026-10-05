import json, urllib.request

BASE = "http://127.0.0.1:8000"
def req(method, path, body=None, token=None, expect=None):
    r = urllib.request.Request(BASE+path, method=method,
        data=json.dumps(body).encode() if body else None,
        headers={"Content-Type":"application/json", **({"Authorization":f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(r) as resp:
            code, data = resp.status, json.loads(resp.read() or b"null")
    except urllib.error.HTTPError as e:
        code, data = e.code, json.loads(e.read() or b"null")
    tag = "OK " if (expect is None or code == expect) else "FAIL"
    print(f"[{tag}] {method} {path} -> {code}" + (f"  (expected {expect})" if tag=="FAIL" else ""))
    if tag == "FAIL": print("   ", str(data)[:200])
    return code, data

tok = {}
for role in ("national","state","district","field","village"):
    _, d = req("POST","/auth/login",{"email":f"{role}@jaldarpaan.in","password":"Demo@1234"},expect=200)
    tok[role] = d["token"]

req("POST","/auth/login",{"email":"national@jaldarpaan.in","password":"wrong"},expect=401)
req("GET","/villages",expect=401)                                        # no token
req("GET","/villages",token=tok["village"],expect=200)
c, d = req("GET","/villages",token=tok["national"],expect=200); print("   villages:",len(d))
req("GET","/villages",token=tok["village"],expect=200)
_, d = req("GET","/villages",token=tok["village"],expect=200); print("   village-scope sees:",[v["id"] for v in d])
req("GET","/villages/VN-2201",token=tok["village"],expect=403)           # out of scope
req("GET","/villages/VN-2201",token=tok["field"],expect=200)
_, d = req("GET","/villages/VN-2201/history?h=24",token=tok["field"],expect=200); print("   history pts:",len(d))
req("GET","/villages/VN-2201/nowcast",token=tok["field"],expect=200)
_, d = req("GET","/risk/live",token=tok["national"],expect=200); print("   bands:",d["counts"],"scenario:",d["scenario"])
req("GET","/risk/live",token=tok["village"],expect=200)
_, d = req("GET","/alerts",token=tok["national"],expect=200); print("   alerts:",len(d),"first:",d[0]["id"],d[0]["severity"],d[0]["status"])
req("POST","/alerts/AL-101/ack",token=tok["village"],expect=403)         # pradhan cannot ack
req("POST","/alerts/AL-101/ack",token=tok["field"],expect=200)
req("POST","/alerts/AL-101/resolve",token=tok["district"],expect=403)    # district cannot resolve
req("POST","/alerts/AL-101/resolve",token=tok["state"],expect=200)
req("POST","/alerts",{"villageId":"VN-2205"},token=tok["field"],expect=403)   # field cannot issue
req("POST","/alerts",{"villageId":"VN-2205"},token=tok["district"],expect=201) # district issues advisory
req("POST","/scenario",{"scenario":"cloudburst"},token=tok["field"],expect=403)
req("POST","/scenario",{"scenario":"cloudburst"},token=tok["district"],expect=200)
req("GET","/sensors",token=tok["village"],expect=403)
_, d = req("GET","/sensors",token=tok["field"],expect=200); print("   nodes:",len(d),"statuses:",sorted({n["status"] for n in d}))
req("GET","/sensors/mqtt/recent",token=tok["field"],expect=200)
req("GET","/analytics/model",token=tok["field"],expect=403)
req("GET","/analytics/model",token=tok["state"],expect=200)
req("GET","/sources/status",token=tok["district"],expect=403)
req("GET","/sources/status",token=tok["state"],expect=200)
req("POST","/telemetry",{"node_id":"ESP32-UK-004","village_code":"VN-2205","timestamp":"2026-10-05T14:35:00+05:30","rainfall_mm_hr":45.2,"soil_moisture_pct":88.4,"water_level_m":1.42,"battery_pct":92,"signal_dbm":-67},expect=202)
req("POST","/telemetry",{"node_id":"ESP32-UK-999","village_code":"VN-9999","rainfall_mm_hr":1},expect=404)
_, d = req("GET","/villages/VN-2205",token=tok["national"],expect=200)
print("   after ingest: rain",d["rainMmHr"],"soil",d["soilPct"],"water",d["waterLevelM"])
print("ALL DONE")
