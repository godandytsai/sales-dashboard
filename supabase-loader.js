// ============================================================
// supabase-loader.js
// 放在 dashboard.html 的 <head> 裡，loadData() 之前載入
// 負責從 Supabase 讀銷售資料，轉成儀表板用的格式
// ============================================================

const _SB_URL = 'https://trxmfvosyfnlidmyelzs.supabase.co'
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeG1mdm9zeWZubGlkbXllbHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTU5NDUsImV4cCI6MjA5Mzc5MTk0NX0.auFOS6ZtcmhsXMWBctFtRr-KnKmGDh4E5jhnk79Vbx0'

async function loadFromSupabase() {
  try {
    // 分批抓所有資料（Supabase 單次最多1000筆）
    let allRows = []
    let from = 0
    const BATCH = 1000

    while (true) {
      const resp = await fetch(
        `${_SB_URL}/rest/v1/sales_order?select=*&order=order_date.asc&limit=${BATCH}&offset=${from}`,
        {
          headers: {
            'apikey': _SB_KEY,
            'Authorization': 'Bearer ' + _SB_KEY
          },
          signal: AbortSignal.timeout(15000)
        }
      )
      if (!resp.ok) throw new Error('HTTP ' + resp.status)
      const batch = await resp.json()
      if (!batch.length) break
      allRows = allRows.concat(batch)
      if (batch.length < BATCH) break
      from += BATCH
    }

    if (!allRows.length) return false

    // 轉成儀表板需要的格式（跟 parseSalesWS 輸出完全一致）
    const map = {}
    for (const r of allRows) {
      const row = {
        id: r.id,
        t: r.order_type,
        y: r.year,
        mo: r.month,
        day: r.day,
        pe: r.sales_rep,
        amt: r.amount,
        se: r.series,
        ca: r.category,
        quotaCa: r.quota_category,
        ma: r.material,
        rawMa: r.raw_material,
        ch: r.channel,
        rawCh: r.raw_channel,
        reg: r.region,
        maGroup: r.material_group,
        qty: r.quantity
      }
      map[r.id] = row
    }

    // 存進 localStorage，讓儀表板直接用
    try {
      localStorage.setItem('sd_sales', JSON.stringify(map))
      localStorage.setItem('sd_smeta', JSON.stringify({
        supabase: {
          rows: allRows.length,
          date: new Date().toLocaleDateString('zh-TW')
        }
      }))
    } catch(e) {
      // localStorage 滿了就只用記憶體
      window._SB_SALES_MAP = map
    }

    console.log('✅ Supabase 載入完成：' + allRows.length + ' 筆')
    return map

  } catch(e) {
    console.warn('Supabase 載入失敗：', e.message)
    return false
  }
}
