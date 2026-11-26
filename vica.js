/*!
 * VICA — script de conversion para Tiendanube (app 54413)
 *
 * Que hace:
 *  1. Barra superior fija con la promo vigente + contador regresivo REAL hasta "promo_end".
 *     Cuando la promo vence, la barra pasa a mostrar los beneficios fijos (no se reinicia).
 *  2. En la ficha de producto, debajo del precio:
 *     - contador corto "La promo termina en 3d 04:12:09"
 *     - beneficios (envios, cambios 30 dias, compra protegida)
 *     - CTA "Comprás para tu empresa?" -> WhatsApp con el nombre del producto
 *
 * Configuracion: query params al asociar el script por API (POST /scripts, query_params),
 * o los valores por defecto de CONFIG.
 *   promo_end   ISO 8601, ej. 2026-12-31T23:59:59-03:00
 *   promo_label texto de la promo, ej. "PROMO LANZAMIENTO 10% OFF"
 *   whatsapp    numero en formato internacional sin +, ej. 541169096822
 *
 * Reglas: sin dependencias, sin jQuery, nunca tira errores en la pagina de la tienda.
 * Nada de urgencia falsa: no hay "quedan 2 unidades" ni "X personas mirando".
 */
(function () {
  "use strict";
  try {
    var CONFIG = {
      promo_end: "2026-12-31T23:59:59-03:00",
      promo_label: "PROMO LANZAMIENTO 10% OFF",
      whatsapp: "541169096822",
      navy: "#0d1b2a",
      accent: "#e85d04",
      light: "#f5f5f0"
    };

    // Params del <script src="...?promo_end=...&store=...">
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || "";
      if (src.indexOf("apps-scripts") !== -1 && src.indexOf("vica") !== -1) {
        var qs = src.split("?")[1] || "";
        qs.split("&").forEach(function (kv) {
          var p = kv.split("=");
          if (p[0] && p[1] && CONFIG.hasOwnProperty(p[0])) CONFIG[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        });
      }
    }

    if (window.__vicaConversion) return;
    window.__vicaConversion = true;

    var END = new Date(CONFIG.promo_end).getTime();
    var promoActiva = function () { return !isNaN(END) && Date.now() < END; };

    var pad = function (n) { return (n < 10 ? "0" : "") + n; }
    var restante = function () {
      var s = Math.max(0, Math.floor((END - Date.now()) / 1000));
      var d = Math.floor(s / 86400); s %= 86400;
      var h = Math.floor(s / 3600); s %= 3600;
      var m = Math.floor(s / 60); s %= 60;
      return (d > 0 ? d + "d " : "") + pad(h) + ":" + pad(m) + ":" + pad(s);
    }

    // Iconos SVG inline (estilo lucide, sin emojis)
    var ICON = {
      truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
      refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
      shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
      clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      building: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>'
    };
    var icon = function (name, size) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (size || 18) + '" height="' + (size || 18) +
        '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        ICON[name] + "</svg>";
    }

    var css = "" +
      ".vica-bar{position:relative;z-index:9999;background:" + CONFIG.navy + ";color:" + CONFIG.light + ";font:600 13px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:9px 40px;letter-spacing:.02em}" +
      ".vica-bar b{color:" + CONFIG.accent + ";font-weight:800}" +
      ".vica-bar .vica-t{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:4px;background:" + CONFIG.accent + ";color:#fff;font-variant-numeric:tabular-nums;font-weight:700}" +
      ".vica-bar .vica-x{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;color:inherit;font-size:18px;cursor:pointer;opacity:.7}" +
      ".vica-pdp{margin:14px 0;font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:" + CONFIG.navy + "}" +
      ".vica-pdp .vica-cd{display:flex;align-items:center;gap:8px;background:#fff4ec;border:1px solid " + CONFIG.accent + ";color:" + CONFIG.accent + ";border-radius:6px;padding:8px 12px;font-weight:700;font-variant-numeric:tabular-nums;margin-bottom:10px}" +
      ".vica-pdp ul{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:6px}" +
      ".vica-pdp li{display:flex;align-items:center;gap:8px}" +
      ".vica-pdp li svg{color:" + CONFIG.accent + ";flex:none}" +
      ".vica-pdp .vica-b2b{display:flex;align-items:center;gap:8px;border:1px dashed #8a9ab0;border-radius:6px;padding:8px 12px;color:" + CONFIG.navy + ";text-decoration:none;font-weight:600}" +
      ".vica-pdp .vica-b2b:hover{border-color:" + CONFIG.accent + ";color:" + CONFIG.accent + "}" +
      ".vica-versiones{margin:6px 0 16px;width:100%}" +
      ".vica-v-t{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#5b6b80;margin-bottom:8px}" +
      ".vica-v-chips{display:flex;flex-wrap:wrap;gap:6px}" +
      ".vica-chip{border:1px solid #c9d0da;border-radius:4px;padding:7px 14px;font-size:13px;color:" + CONFIG.navy + ";text-decoration:none;font-weight:600}" +
      ".vica-chip:hover{border-color:" + CONFIG.accent + ";color:" + CONFIG.accent + "}" +
      ".vica-chip.on{background:" + CONFIG.navy + ";border-color:" + CONFIG.navy + ";color:#fff}" +
      ".vica-v-est{display:inline-block;margin-top:10px;font-size:13px;font-weight:700;color:" + CONFIG.accent + ";text-decoration:none}" +
      ".vica-equipo{max-width:1200px;margin:40px auto 24px;padding:0 16px}" +
      ".vica-equipo h3{text-align:center;margin:0 0 20px}" +
      ".vica-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}" +
      "@media(max-width:767px){.vica-grid{grid-template-columns:repeat(2,1fr)}}" +
      ".vica-card{text-decoration:none;color:" + CONFIG.navy + "}" +
      ".vica-card img,.vica-ph{width:100%;aspect-ratio:1/1;object-fit:cover;background:#eef1f6;display:block;border-radius:4px}" +
      ".vica-ph{display:flex;align-items:center;justify-content:center;font:700 32px Oswald,Impact,sans-serif;color:#c9d0da;letter-spacing:.08em}" +
      ".vica-cn{font-size:13px;font-weight:600;margin:10px 0 4px}" +
      ".vica-cp s{opacity:.55;font-size:12px;margin-right:4px}.vica-cp b{color:" + CONFIG.accent + "}";
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    // 1) Barra superior
    var bar = null;
    var cerrada = false;
    try { cerrada = sessionStorage.getItem("vica_bar_closed") === "1"; } catch (e) {}
    var chips = [];  // contadores insertados en la barra de anuncios del tema
    var crearBarra = function () {
      // Si el tema ya tiene barra de anuncios (Rio), el contador va adentro del mensaje de la promo
      var msgs = document.querySelectorAll(".section-adbar .adbar-message");
      if (msgs.length) {
        Array.prototype.forEach.call(msgs, function (m) {
          if (/OFF/i.test(m.textContent) && promoActiva()) {
            var c = document.createElement("span");
            c.className = "vica-t";
            c.style.cssText = "display:inline-block;margin-left:8px;padding:1px 8px;border-radius:4px;background:" +
              CONFIG.accent + ";color:#fff;font-variant-numeric:tabular-nums;font-weight:700";
            c.textContent = restante();
            (m.querySelector("a,span,div") || m).appendChild(c);
            chips.push(c);
          }
        });
        return;
      }
      if (cerrada) return;
      bar = document.createElement("div");
      bar.className = "vica-bar";
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", "Promociones");
      document.body.insertBefore(bar, document.body.firstChild);
    };
    var MSG_FIJOS = ["Envíos a todo el país", "Cambios en 30 días", "Pedidos para empresas con tu logo"];
    var idx = 0;

    var pintarBarra = function () {
      if (!bar) return;
      if (promoActiva()) {
        bar.innerHTML = "<b>" + CONFIG.promo_label + "</b> · Termina en<span class='vica-t'>" + restante() + "</span>" +
          "<button class='vica-x' aria-label='Cerrar'>&times;</button>";
      } else {
        bar.innerHTML = MSG_FIJOS[idx % MSG_FIJOS.length] + "<button class='vica-x' aria-label='Cerrar'>&times;</button>";
      }
      bar.querySelector(".vica-x").onclick = function () {
        try { sessionStorage.setItem("vica_bar_closed", "1"); } catch (e) {}
        bar.parentNode.removeChild(bar);
        bar = null;
      };
    }

    // 2) Ficha de producto
    var cd = null;
    var montarPDP = function () {
      if (!window.LS || !LS.product) return;
      var ancla = document.querySelector(".js-price-container") ||
                  document.querySelector("#price_display") && document.querySelector("#price_display").parentNode ||
                  document.querySelector(".js-price-display") && document.querySelector(".js-price-display").parentNode;
      if (!ancla || document.querySelector(".vica-pdp")) return;
      var nombre = (LS.product && LS.product.name) || "este producto";
      var wa = "https://wa.me/" + CONFIG.whatsapp + "?text=" +
        encodeURIComponent("Hola VICA! Quiero precio por cantidad para " + nombre + ".");
      // Contador: pegado al precio
      if (promoActiva()) {
        var cdBox = document.createElement("div");
        cdBox.className = "vica-pdp";
        cdBox.innerHTML = "<div class='vica-cd'>" + icon("clock") + "<span>La promo termina en <span class='vica-cd-t'>" +
          restante() + "</span></span></div>";
        ancla.parentNode.insertBefore(cdBox, ancla.nextSibling);
        cd = cdBox.querySelector(".vica-cd-t");
      }
      // Beneficios + CTA empresas: debajo del boton de compra, para no empujarlo hacia abajo
      var box = document.createElement("div");
      box.className = "vica-pdp";
      box.innerHTML =
        "<ul>" +
        "<li>" + icon("truck") + "<span>Envíos a todo el país</span></li>" +
        "<li>" + icon("refresh") + "<span>Cambios de talle en 30 días</span></li>" +
        "<li>" + icon("shield") + "<span>Compra protegida · 10 días de arrepentimiento</span></li>" +
        "</ul>" +
        "<a class='vica-b2b' href='" + wa + "' target='_blank' rel='noopener'>" + icon("building") +
        "<span>¿Comprás para tu empresa? Pedí precio por cantidad</span></a>";
      var form = document.querySelector(".js-product-form");
      if (form) form.parentNode.insertBefore(box, form.nextSibling);
      else ancla.parentNode.insertBefore(box, ancla.nextSibling);
    };

    // 4) Bloques de la ficha: "Otras versiones" y "Completá tu equipo" (datos embebidos por generar_gtm.py)
    var DATA = {"prod":{"383442289":{"n":"Remera Lisa Unisex","u":"/productos/remera-lisa-unisex/","i":"https://dcdn-us.mitiendanube.com/stores/008/076/474/products/remera-de-trabajo-blanca-6591282d67d16370c217956353786125-480-0.png","p":8900.0,"pp":8010.0,"c":"Remeras"},"383444155":{"n":"Pantalón Grafa 70 Cargo","u":"/productos/pantalon-grafa-70-cargo/","i":"https://dcdn-us.mitiendanube.com/stores/008/076/474/products/pantalon-grafa-70-ombu-1-07d92466866fa6766f17956398178609-480-0.jpg","p":36900.0,"pp":33190.0,"c":"Pantalones"},"383445469":{"n":"Gorra Trucker","u":"/productos/gorra-trucker/","i":"https://dcdn-us.mitiendanube.com/stores/008/076/474/products/gorra-trucker-lisa-negro-total-2b6de20581291cb04f17956357306500-480-0.png","p":2390.0,"pp":2150.0,"c":"Gorros y Gorras"},"383445706":{"n":"Borcego de Seguridad MicFer","u":"/productos/borcego-de-seguridad-micfer/","i":"https://dcdn-us.mitiendanube.com/stores/008/076/474/products/borcego-de-seguridad-micfer-negro-26528ffc0e3d67b22717956398435778-480-0.jpg","p":49900.0,"pp":44890.0,"c":"Seguridad"},"383527968":{"n":"Pantalón Grafa 70 Común","u":"/productos/pantalon-grafa-70-comun-11dgo/","i":null,"p":24900.0,"pp":22390.0,"c":"Pantalones"},"383527998":{"n":"Pantalón Grafa 70 Jogger","u":"/productos/pantalon-grafa-70-jogger-1ib3g/","i":null,"p":34900.0,"pp":31390.0,"c":"Pantalones"},"383528028":{"n":"Pantalón Grafa 70 Náutico","u":"/productos/pantalon-grafa-70-nautico-x1ojh/","i":null,"p":21900.0,"pp":19690.0,"c":"Pantalones"},"383528060":{"n":"Remera Lisa Mujer","u":"/productos/remera-lisa-mujer-1t0uj/","i":null,"p":8900.0,"pp":8010.0,"c":"Remeras"},"383528072":{"n":"Remera Lisa Niño","u":"/productos/remera-lisa-nino-1p5sq/","i":null,"p":6900.0,"pp":6210.0,"c":"Remeras"},"383528091":{"n":"Musculosa Lisa","u":"/productos/musculosa-lisa-xx2w4/","i":null,"p":9900.0,"pp":8910.0,"c":"Remeras"},"383528108":{"n":"Remera Lisa Oversize","u":"/productos/remera-lisa-oversize-9e6l8/","i":null,"p":11900.0,"pp":10690.0,"c":"Remeras"},"383528123":{"n":"Remera Lisa Talles Especiales","u":"/productos/remera-lisa-talles-especiales-1egfy/","i":null,"p":11900.0,"pp":10690.0,"c":"Remeras"},"383528135":{"n":"Remera Estampada Unisex","u":"/productos/remera-estampada-unisex-11knm/","i":null,"p":16900.0,"pp":15190.0,"c":"Estampados"},"383528142":{"n":"Remera Estampada Mujer","u":"/productos/remera-estampada-mujer-dtsal/","i":null,"p":16900.0,"pp":15190.0,"c":"Estampados"},"383528153":{"n":"Remera Estampada Niño","u":"/productos/remera-estampada-nino-191en/","i":null,"p":14900.0,"pp":13390.0,"c":"Estampados"},"383528164":{"n":"Musculosa Estampada","u":"/productos/musculosa-estampada-9dwdb/","i":null,"p":16900.0,"pp":15190.0,"c":"Estampados"},"383528172":{"n":"Remera Estampada Oversize","u":"/productos/remera-estampada-oversize-1p79r/","i":null,"p":19900.0,"pp":17890.0,"c":"Estampados"},"383528189":{"n":"Remera Estampada Talles Especiales","u":"/productos/remera-estampada-talles-especiales-1yy0b/","i":null,"p":19900.0,"pp":17890.0,"c":"Estampados"},"383528197":{"n":"Gorra de Poliéster","u":"/productos/gorra-de-poliester-uxkja/","i":null,"p":1990.0,"pp":1790.0,"c":"Gorros y Gorras"},"383528207":{"n":"Gorra Béisbol","u":"/productos/gorra-beisbol-1989x/","i":null,"p":4200.0,"pp":3780.0,"c":"Gorros y Gorras"},"383528216":{"n":"Gorro Nuquera","u":"/productos/gorro-nuquera-1s449/","i":null,"p":5900.0,"pp":5310.0,"c":"Gorros y Gorras"},"383528232":{"n":"Gorro Australiano","u":"/productos/gorro-australiano-6q2li/","i":null,"p":8900.0,"pp":8010.0,"c":"Gorros y Gorras"},"383528243":{"n":"Gorro Piluso","u":"/productos/gorro-piluso-z4m61/","i":null,"p":3900.0,"pp":3510.0,"c":"Gorros y Gorras"},"383528255":{"n":"Gorra de Poliéster Estampada","u":"/productos/gorra-de-poliester-estampada-2d4hf/","i":null,"p":4900.0,"pp":4410.0,"c":"Estampados"},"383528265":{"n":"Gorra Trucker Estampada","u":"/productos/gorra-trucker-estampada-5mw3c/","i":null,"p":5900.0,"pp":5310.0,"c":"Estampados"},"383528278":{"n":"Gorro Piluso Estampado","u":"/productos/gorro-piluso-estampado-1rlyo/","i":null,"p":5900.0,"pp":5310.0,"c":"Estampados"},"383528284":{"n":"Delantal de Gabardina","u":"/productos/delantal-de-gabardina-15t3f/","i":null,"p":19900.0,"pp":17890.0,"c":"Delantales"},"383528297":{"n":"Delantal Tropical Mecánico","u":"/productos/delantal-tropical-mecanico-5fyqx/","i":null,"p":14900.0,"pp":13390.0,"c":"Delantales"},"383528310":{"n":"Faldón Corto de Gabardina","u":"/productos/faldon-corto-de-gabardina-1d9dx/","i":null,"p":14900.0,"pp":13390.0,"c":"Delantales"},"383528321":{"n":"Camisa Grafa 70","u":"/productos/camisa-grafa-70-bs4g8/","i":null,"p":28900.0,"pp":25990.0,"c":"Camisas y Ambos"},"383528343":{"n":"Ambo Médico Grafa 70","u":"/productos/ambo-medico-grafa-70-5p22b/","i":null,"p":42900.0,"pp":38590.0,"c":"Camisas y Ambos"},"383528362":{"n":"Chaleco Reflectivo Flúor","u":"/productos/chaleco-reflectivo-fluor-i08i5/","i":null,"p":3900.0,"pp":3510.0,"c":"Seguridad"}},"fam":[{"t":"Otras versiones","it":[[383527968,"Común"],[383444155,"Cargo"],[383527998,"Jogger"],[383528028,"Náutico"]]},{"t":"Otras versiones","it":[[383442289,"Unisex"],[383528060,"Mujer"],[383528072,"Niño"],[383528091,"Musculosa"],[383528108,"Oversize"],[383528123,"Talles especiales"]]},{"t":"Otras versiones","it":[[383528135,"Unisex"],[383528142,"Mujer"],[383528153,"Niño"],[383528164,"Musculosa"],[383528172,"Oversize"],[383528189,"Talles especiales"]]},{"t":"Otros modelos","it":[[383528197,"Poliéster"],[383445469,"Trucker"],[383528207,"Béisbol"],[383528216,"Nuquera"],[383528232,"Australiano"],[383528243,"Piluso"]]},{"t":"Otros modelos","it":[[383528284,"Gabardina"],[383528297,"Tropical mecánico"],[383528310,"Faldón corto"]]}],"par":{"383442289":383528135,"383528060":383528142,"383528072":383528153,"383528091":383528164,"383528108":383528172,"383528123":383528189,"383528197":383528255,"383445469":383528265,"383528243":383528278},"cross":{"Pantalones":[383442289,383528321,383445469,383445706],"Remeras":[383444155,383527968,383445469,383528362],"Estampados":[383528265,383444155,383442289,383528284],"Gorros y Gorras":[383442289,383444155,383528362,383528216],"Delantales":[383442289,383445469,383528028,383528135],"Camisas y Ambos":[383444155,383527968,383445706,383528362],"Seguridad":[383444155,383528321,383528362,383445706]},"piloto":[383527968,383444155,383527998,383528028]};
    var fmt = function (n) { return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
    var montarBloques = function () {
      if (!DATA || !window.LS || !LS.product) return;
      var pid = Number(LS.product.id);
      var yo = DATA.prod[String(pid)];
      if (!yo) return;
      if (DATA.piloto.length && DATA.piloto.indexOf(pid) === -1) return;

      // Otras versiones (antes de los selectores de color/talle)
      var fam = null;
      for (var a = 0; a < DATA.fam.length; a++) {
        for (var b = 0; b < DATA.fam[a].it.length; b++) { if (DATA.fam[a].it[b][0] === pid) fam = DATA.fam[a]; }
      }
      var est = DATA.par[String(pid)];
      var form = document.querySelector(".js-product-form");
      var ancla = form && (form.querySelector(".js-product-variants") || form.firstElementChild);
      if ((fam || est) && ancla && !document.querySelector(".vica-versiones")) {
        var html = "";
        if (fam) {
          html += "<div class='vica-v-t'>" + fam.t + "</div><div class='vica-v-chips'>";
          for (var k = 0; k < fam.it.length; k++) {
            var d = DATA.prod[String(fam.it[k][0])];
            if (!d) continue;
            html += fam.it[k][0] === pid ? "<span class='vica-chip on'>" + fam.it[k][1] + "</span>"
                                         : "<a class='vica-chip' href='" + d.u + "'>" + fam.it[k][1] + "</a>";
          }
          html += "</div>";
        }
        if (est && DATA.prod[String(est)]) {
          html += "<a class='vica-v-est' href='" + DATA.prod[String(est)].u + "'>¿Lo querés con tu logo? Ver la versión estampada →</a>";
        }
        var vb = document.createElement("div");
        vb.className = "vica-versiones";
        vb.innerHTML = html;
        ancla.parentNode.insertBefore(vb, ancla);
      }

      // Completá tu equipo (antes de "Productos similares")
      var lista = DATA.cross[yo.c] || [];
      var cards = "", n = 0;
      for (var q = 0; q < lista.length && n < 4; q++) {
        if (lista[q] === pid) continue;
        var c = DATA.prod[String(lista[q])];
        if (!c) continue;
        n++;
        cards += "<a class='vica-card' href='" + c.u + "'>" +
          (c.i ? "<img loading='lazy' src='" + c.i + "' alt='" + c.n + "'>" : "<div class='vica-ph'>VICA</div>") +
          "<div class='vica-cn'>" + c.n + "</div><div class='vica-cp'>" +
          (c.pp ? "<s>" + fmt(c.p) + "</s> <b>" + fmt(c.pp) + "</b>" : "<b>" + fmt(c.p) + "</b>") + "</div></a>";
      }
      if (n && !document.querySelector(".vica-equipo")) {
        var sec = document.createElement("section");
        sec.className = "vica-equipo";
        sec.innerHTML = "<h3>Completá tu equipo</h3><div class='vica-grid'>" + cards + "</div>";
        var rel = document.querySelector(".js-related-products");
        var desc = document.querySelector(".product-description");
        if (rel) rel.parentNode.insertBefore(sec, rel);
        else if (desc) desc.parentNode.insertBefore(sec, desc.nextSibling);
      }
    };

    var tick = function () {
      try {
        if (promoActiva()) {
          if (bar) { var t = bar.querySelector(".vica-t"); if (t) t.textContent = restante(); else pintarBarra(); }
          if (cd) cd.textContent = restante();
          for (var k = 0; k < chips.length; k++) chips[k].textContent = restante();
        } else if (cd) {
          var w = cd.closest(".vica-cd"); if (w) w.parentNode.removeChild(w); cd = null; pintarBarra();
        }
      } catch (e) {}
    }

    // 3) Autoplay del carrusel de la home (Rio no lo trae en el editor). Pausa con el mouse encima.
    var autoplayCarrusel = function () {
      var sliders = document.querySelectorAll(".js-home-slider, .js-home-slider-mobile");
      Array.prototype.forEach.call(sliders, function (el) {
        var pausa = false;
        el.addEventListener("mouseenter", function () { pausa = true; });
        el.addEventListener("mouseleave", function () { pausa = false; });
        setInterval(function () {
          try {
            if (pausa || !el.offsetParent || document.hidden) return;
            var sw = el.swiper;
            if (sw) {
              if (sw.isEnd && !sw.params.loop) sw.slideTo(0); else sw.slideNext();
            } else {
              var next = el.parentNode.querySelector(".js-swiper-home-next, .js-swiper-home-next-mobile");
              if (next) next.click();
            }
          } catch (e) {}
        }, 5000);
      });
    }

    // Espera a que la pagina este armada (GTM con "All Pages" puede disparar antes del <body>)
    var iniciar = function () {
      try {
        crearBarra();
        pintarBarra();
        montarPDP();
        montarBloques();
        autoplayCarrusel();
        setInterval(tick, 1000);
        setInterval(function () { if (!promoActiva()) { idx++; pintarBarra(); } }, 4000);
      } catch (e) { if (window.console) console.warn("[vica-conversion]", e); }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();
  } catch (err) {
    if (window.console) console.warn("[vica-conversion]", err);
  }
})();
