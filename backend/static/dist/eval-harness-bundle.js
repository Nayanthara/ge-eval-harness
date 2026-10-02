var Pi = Object.defineProperty;
var Li = (o, e, t) => e in o ? Pi(o, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : o[e] = t;
var ye = (o, e, t) => Li(o, typeof e != "symbol" ? e + "" : e, t);
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const je = globalThis, wt = je.ShadowRoot && (je.ShadyCSS === void 0 || je.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Ct = Symbol(), Ut = /* @__PURE__ */ new WeakMap();
let ai = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== Ct) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (wt && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = Ut.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && Ut.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Mi = (o) => new ai(typeof o == "string" ? o : o + "", void 0, Ct), B = (o, ...e) => {
  const t = o.length === 1 ? o[0] : e.reduce((i, r, n) => i + ((s) => {
    if (s._$cssResult$ === !0) return s.cssText;
    if (typeof s == "number") return s;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + s + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + o[n + 1], o[0]);
  return new ai(t, o, Ct);
}, Di = (o, e) => {
  if (wt) o.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), r = je.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = t.cssText, o.appendChild(i);
  }
}, Bt = wt ? (o) => o : (o) => o instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return Mi(t);
})(o) : o;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Ni, defineProperty: Ui, getOwnPropertyDescriptor: Bi, getOwnPropertyNames: Fi, getOwnPropertySymbols: qi, getPrototypeOf: Hi } = Object, de = globalThis, Ft = de.trustedTypes, Vi = Ft ? Ft.emptyScript : "", et = de.reactiveElementPolyfillSupport, Te = (o, e) => o, We = { toAttribute(o, e) {
  switch (e) {
    case Boolean:
      o = o ? Vi : null;
      break;
    case Object:
    case Array:
      o = o == null ? o : JSON.stringify(o);
  }
  return o;
}, fromAttribute(o, e) {
  let t = o;
  switch (e) {
    case Boolean:
      t = o !== null;
      break;
    case Number:
      t = o === null ? null : Number(o);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(o);
      } catch {
        t = null;
      }
  }
  return t;
} }, $t = (o, e) => !Ni(o, e), qt = { attribute: !0, type: String, converter: We, reflect: !1, useDefault: !1, hasChanged: $t };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), de.litPropertyMetadata ?? (de.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let xe = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ?? (this.l = [])).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = qt) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = Symbol(), r = this.getPropertyDescriptor(e, i, t);
      r !== void 0 && Ui(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: r, set: n } = Bi(this.prototype, e) ?? { get() {
      return this[t];
    }, set(s) {
      this[t] = s;
    } };
    return { get: r, set(s) {
      const l = r == null ? void 0 : r.call(this);
      n == null || n.call(this, s), this.requestUpdate(e, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? qt;
  }
  static _$Ei() {
    if (this.hasOwnProperty(Te("elementProperties"))) return;
    const e = Hi(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(Te("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(Te("properties"))) {
      const t = this.properties, i = [...Fi(t), ...qi(t)];
      for (const r of i) this.createProperty(r, t[r]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [i, r] of t) this.elementProperties.set(i, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, i] of this.elementProperties) {
      const r = this._$Eu(t, i);
      r !== void 0 && this._$Eh.set(r, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const r of i) t.unshift(Bt(r));
    } else e !== void 0 && t.push(Bt(e));
    return t;
  }
  static _$Eu(e, t) {
    const i = t.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var e;
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (e = this.constructor.l) == null || e.forEach((t) => t(this));
  }
  addController(e) {
    var t;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(e), this.renderRoot !== void 0 && this.isConnected && ((t = e.hostConnected) == null || t.call(e));
  }
  removeController(e) {
    var t;
    (t = this._$EO) == null || t.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
    for (const i of t.keys()) this.hasOwnProperty(i) && (e.set(i, this[i]), delete this[i]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Di(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    var e;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (e = this._$EO) == null || e.forEach((t) => {
      var i;
      return (i = t.hostConnected) == null ? void 0 : i.call(t);
    });
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    var e;
    (e = this._$EO) == null || e.forEach((t) => {
      var i;
      return (i = t.hostDisconnected) == null ? void 0 : i.call(t);
    });
  }
  attributeChangedCallback(e, t, i) {
    this._$AK(e, i);
  }
  _$ET(e, t) {
    var n;
    const i = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, i);
    if (r !== void 0 && i.reflect === !0) {
      const s = (((n = i.converter) == null ? void 0 : n.toAttribute) !== void 0 ? i.converter : We).toAttribute(t, i.type);
      this._$Em = e, s == null ? this.removeAttribute(r) : this.setAttribute(r, s), this._$Em = null;
    }
  }
  _$AK(e, t) {
    var n, s;
    const i = this.constructor, r = i._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const l = i.getPropertyOptions(r), d = typeof l.converter == "function" ? { fromAttribute: l.converter } : ((n = l.converter) == null ? void 0 : n.fromAttribute) !== void 0 ? l.converter : We;
      this._$Em = r;
      const m = d.fromAttribute(t, l.type);
      this[r] = m ?? ((s = this._$Ej) == null ? void 0 : s.get(r)) ?? m, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, r = !1, n) {
    var s;
    if (e !== void 0) {
      const l = this.constructor;
      if (r === !1 && (n = this[e]), i ?? (i = l.getPropertyOptions(e)), !((i.hasChanged ?? $t)(n, t) || i.useDefault && i.reflect && n === ((s = this._$Ej) == null ? void 0 : s.get(e)) && !this.hasAttribute(l._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: r, wrapped: n }, s) {
    i && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, s ?? t ?? this[e]), n !== !0 || s !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), r === !0 && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var i;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [n, s] of this._$Ep) this[n] = s;
        this._$Ep = void 0;
      }
      const r = this.constructor.elementProperties;
      if (r.size > 0) for (const [n, s] of r) {
        const { wrapped: l } = s, d = this[n];
        l !== !0 || this._$AL.has(n) || d === void 0 || this.C(n, void 0, s, d);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), (i = this._$EO) == null || i.forEach((r) => {
        var n;
        return (n = r.hostUpdate) == null ? void 0 : n.call(r);
      }), this.update(t)) : this._$EM();
    } catch (r) {
      throw e = !1, this._$EM(), r;
    }
    e && this._$AE(t);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    var t;
    (t = this._$EO) == null || t.forEach((i) => {
      var r;
      return (r = i.hostUpdated) == null ? void 0 : r.call(i);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((t) => this._$ET(t, this[t]))), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
xe.elementStyles = [], xe.shadowRootOptions = { mode: "open" }, xe[Te("elementProperties")] = /* @__PURE__ */ new Map(), xe[Te("finalized")] = /* @__PURE__ */ new Map(), et == null || et({ ReactiveElement: xe }), (de.reactiveElementVersions ?? (de.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ae = globalThis, Ht = (o) => o, Ke = Ae.trustedTypes, Vt = Ke ? Ke.createPolicy("lit-html", { createHTML: (o) => o }) : void 0, li = "$lit$", le = `lit$${Math.random().toFixed(9).slice(2)}$`, di = "?" + le, ji = `<${di}>`, fe = document, Ie = () => fe.createComment(""), Re = (o) => o === null || typeof o != "object" && typeof o != "function", Et = Array.isArray, Gi = (o) => Et(o) || typeof (o == null ? void 0 : o[Symbol.iterator]) == "function", tt = `[ 	
\f\r]`, Ee = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, jt = /-->/g, Gt = />/g, pe = RegExp(`>|${tt}(?:([^\\s"'>=/]+)(${tt}*=${tt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Wt = /'/g, Kt = /"/g, ci = /^(?:script|style|textarea|title)$/i, Wi = (o) => (e, ...t) => ({ _$litType$: o, strings: e, values: t }), p = Wi(1), G = Symbol.for("lit-noChange"), b = Symbol.for("lit-nothing"), Yt = /* @__PURE__ */ new WeakMap(), he = fe.createTreeWalker(fe, 129);
function ui(o, e) {
  if (!Et(o) || !o.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Vt !== void 0 ? Vt.createHTML(e) : e;
}
const Ki = (o, e) => {
  const t = o.length - 1, i = [];
  let r, n = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", s = Ee;
  for (let l = 0; l < t; l++) {
    const d = o[l];
    let m, g, u = -1, v = 0;
    for (; v < d.length && (s.lastIndex = v, g = s.exec(d), g !== null); ) v = s.lastIndex, s === Ee ? g[1] === "!--" ? s = jt : g[1] !== void 0 ? s = Gt : g[2] !== void 0 ? (ci.test(g[2]) && (r = RegExp("</" + g[2], "g")), s = pe) : g[3] !== void 0 && (s = pe) : s === pe ? g[0] === ">" ? (s = r ?? Ee, u = -1) : g[1] === void 0 ? u = -2 : (u = s.lastIndex - g[2].length, m = g[1], s = g[3] === void 0 ? pe : g[3] === '"' ? Kt : Wt) : s === Kt || s === Wt ? s = pe : s === jt || s === Gt ? s = Ee : (s = pe, r = void 0);
    const y = s === pe && o[l + 1].startsWith("/>") ? " " : "";
    n += s === Ee ? d + ji : u >= 0 ? (i.push(m), d.slice(0, u) + li + d.slice(u) + le + y) : d + le + (u === -2 ? l : y);
  }
  return [ui(o, n + (o[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class Oe {
  constructor({ strings: e, _$litType$: t }, i) {
    let r;
    this.parts = [];
    let n = 0, s = 0;
    const l = e.length - 1, d = this.parts, [m, g] = Ki(e, t);
    if (this.el = Oe.createElement(m, i), he.currentNode = this.el.content, t === 2 || t === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (r = he.nextNode()) !== null && d.length < l; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const u of r.getAttributeNames()) if (u.endsWith(li)) {
          const v = g[s++], y = r.getAttribute(u).split(le), T = /([.?@])?(.*)/.exec(v);
          d.push({ type: 1, index: n, name: T[2], strings: y, ctor: T[1] === "." ? Xi : T[1] === "?" ? Qi : T[1] === "@" ? Ji : Qe }), r.removeAttribute(u);
        } else u.startsWith(le) && (d.push({ type: 6, index: n }), r.removeAttribute(u));
        if (ci.test(r.tagName)) {
          const u = r.textContent.split(le), v = u.length - 1;
          if (v > 0) {
            r.textContent = Ke ? Ke.emptyScript : "";
            for (let y = 0; y < v; y++) r.append(u[y], Ie()), he.nextNode(), d.push({ type: 2, index: ++n });
            r.append(u[v], Ie());
          }
        }
      } else if (r.nodeType === 8) if (r.data === di) d.push({ type: 2, index: n });
      else {
        let u = -1;
        for (; (u = r.data.indexOf(le, u + 1)) !== -1; ) d.push({ type: 7, index: n }), u += le.length - 1;
      }
      n++;
    }
  }
  static createElement(e, t) {
    const i = fe.createElement("template");
    return i.innerHTML = e, i;
  }
}
function Ce(o, e, t = o, i) {
  var s, l;
  if (e === G) return e;
  let r = i !== void 0 ? (s = t._$Co) == null ? void 0 : s[i] : t._$Cl;
  const n = Re(e) ? void 0 : e._$litDirective$;
  return (r == null ? void 0 : r.constructor) !== n && ((l = r == null ? void 0 : r._$AO) == null || l.call(r, !1), n === void 0 ? r = void 0 : (r = new n(o), r._$AT(o, t, i)), i !== void 0 ? (t._$Co ?? (t._$Co = []))[i] = r : t._$Cl = r), r !== void 0 && (e = Ce(o, r._$AS(o, e.values), r, i)), e;
}
class Yi {
  constructor(e, t) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: t }, parts: i } = this._$AD, r = ((e == null ? void 0 : e.creationScope) ?? fe).importNode(t, !0);
    he.currentNode = r;
    let n = he.nextNode(), s = 0, l = 0, d = i[0];
    for (; d !== void 0; ) {
      if (s === d.index) {
        let m;
        d.type === 2 ? m = new Le(n, n.nextSibling, this, e) : d.type === 1 ? m = new d.ctor(n, d.name, d.strings, this, e) : d.type === 6 && (m = new Zi(n, this, e)), this._$AV.push(m), d = i[++l];
      }
      s !== (d == null ? void 0 : d.index) && (n = he.nextNode(), s++);
    }
    return he.currentNode = fe, r;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class Le {
  get _$AU() {
    var e;
    return ((e = this._$AM) == null ? void 0 : e._$AU) ?? this._$Cv;
  }
  constructor(e, t, i, r) {
    this.type = 2, this._$AH = b, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = r, this._$Cv = (r == null ? void 0 : r.isConnected) ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const t = this._$AM;
    return t !== void 0 && (e == null ? void 0 : e.nodeType) === 11 && (e = t.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, t = this) {
    e = Ce(this, e, t), Re(e) ? e === b || e == null || e === "" ? (this._$AH !== b && this._$AR(), this._$AH = b) : e !== this._$AH && e !== G && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Gi(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== b && Re(this._$AH) ? this._$AA.nextSibling.data = e : this.T(fe.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    var n;
    const { values: t, _$litType$: i } = e, r = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = Oe.createElement(ui(i.h, i.h[0]), this.options)), i);
    if (((n = this._$AH) == null ? void 0 : n._$AD) === r) this._$AH.p(t);
    else {
      const s = new Yi(r, this), l = s.u(this.options);
      s.p(t), this.T(l), this._$AH = s;
    }
  }
  _$AC(e) {
    let t = Yt.get(e.strings);
    return t === void 0 && Yt.set(e.strings, t = new Oe(e)), t;
  }
  k(e) {
    Et(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, r = 0;
    for (const n of e) r === t.length ? t.push(i = new Le(this.O(Ie()), this.O(Ie()), this, this.options)) : i = t[r], i._$AI(n), r++;
    r < t.length && (this._$AR(i && i._$AB.nextSibling, r), t.length = r);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    var i;
    for ((i = this._$AP) == null ? void 0 : i.call(this, !1, !0, t); e !== this._$AB; ) {
      const r = Ht(e).nextSibling;
      Ht(e).remove(), e = r;
    }
  }
  setConnected(e) {
    var t;
    this._$AM === void 0 && (this._$Cv = e, (t = this._$AP) == null || t.call(this, e));
  }
}
class Qe {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, i, r, n) {
    this.type = 1, this._$AH = b, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = n, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = b;
  }
  _$AI(e, t = this, i, r) {
    const n = this.strings;
    let s = !1;
    if (n === void 0) e = Ce(this, e, t, 0), s = !Re(e) || e !== this._$AH && e !== G, s && (this._$AH = e);
    else {
      const l = e;
      let d, m;
      for (e = n[0], d = 0; d < n.length - 1; d++) m = Ce(this, l[i + d], t, d), m === G && (m = this._$AH[d]), s || (s = !Re(m) || m !== this._$AH[d]), m === b ? e = b : e !== b && (e += (m ?? "") + n[d + 1]), this._$AH[d] = m;
    }
    s && !r && this.j(e);
  }
  j(e) {
    e === b ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Xi extends Qe {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === b ? void 0 : e;
  }
}
class Qi extends Qe {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== b);
  }
}
class Ji extends Qe {
  constructor(e, t, i, r, n) {
    super(e, t, i, r, n), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = Ce(this, e, t, 0) ?? b) === G) return;
    const i = this._$AH, r = e === b && i !== b || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, n = e !== b && (i === b || r);
    r && this.element.removeEventListener(this.name, this, i), n && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    var t;
    typeof this._$AH == "function" ? this._$AH.call(((t = this.options) == null ? void 0 : t.host) ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Zi {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    Ce(this, e);
  }
}
const it = Ae.litHtmlPolyfillSupport;
it == null || it(Oe, Le), (Ae.litHtmlVersions ?? (Ae.litHtmlVersions = [])).push("3.3.3");
const St = (o, e, t) => {
  const i = (t == null ? void 0 : t.renderBefore) ?? e;
  let r = i._$litPart$;
  if (r === void 0) {
    const n = (t == null ? void 0 : t.renderBefore) ?? null;
    i._$litPart$ = r = new Le(e.insertBefore(Ie(), n), n, void 0, t ?? {});
  }
  return r._$AI(o), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const me = globalThis;
let I = class extends xe {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t;
    const e = super.createRenderRoot();
    return (t = this.renderOptions).renderBefore ?? (t.renderBefore = e.firstChild), e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = St(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var e;
    super.connectedCallback(), (e = this._$Do) == null || e.setConnected(!0);
  }
  disconnectedCallback() {
    var e;
    super.disconnectedCallback(), (e = this._$Do) == null || e.setConnected(!1);
  }
  render() {
    return G;
  }
};
var si;
I._$litElement$ = !0, I.finalized = !0, (si = me.litElementHydrateSupport) == null || si.call(me, { LitElement: I });
const ot = me.litElementPolyfillSupport;
ot == null || ot({ LitElement: I });
(me.litElementVersions ?? (me.litElementVersions = [])).push("4.2.2");
class pi extends I {
  constructor() {
    super(), this.active = "home", this.collapsed = !1;
  }
  createRenderRoot() {
    return this;
  }
  _navigate(e) {
    this.dispatchEvent(new CustomEvent("navigate", { detail: e }));
  }
  _toggle() {
    this.collapsed = !this.collapsed;
    const e = document.getElementById("sidebar");
    e && (this.collapsed ? e.classList.add("collapsed") : e.classList.remove("collapsed"));
  }
  render() {
    return p`
      <div class="sidebar-brand">
          <h1 style="margin: 0; font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; background: linear-gradient(135deg, #0b57d0 0%, #6750a4 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap;">GE Eval Harness</h1>
      </div>
      <div class="sidebar-nav">
          <button class="nav-item ${this.active === "home" ? "active" : ""}" @click="${() => this._navigate("home")}">
              <span class="icon">🏠</span> <span>Home</span>
          </button>
          <button class="nav-item ${this.active === "results" ? "active" : ""}" @click="${() => this._navigate("results")}">
              <span class="icon">📈</span> <span>Results</span>
          </button>
          <button class="nav-item ${this.active === "datasets" ? "active" : ""}" @click="${() => this._navigate("datasets")}">
              <span class="icon">📁</span> <span>Datasets</span>
          </button>
          <button class="nav-item ${this.active === "run-status" ? "active" : ""}" @click="${() => this._navigate("run-status")}">
              <span class="icon">📋</span> <span>Run Status</span>
          </button>
          <button class="nav-item ${this.active === "settings" ? "active" : ""}" @click="${() => this._navigate("settings")}">
              <span class="icon">⚙️</span> <span>Settings</span>
          </button>
      </div>
      <button class="sidebar-toggle" @click="${this._toggle}" title="Toggle Sidebar">
          <span>${this.collapsed ? "▶" : "◀"}</span>
      </button>
    `;
  }
}
ye(pi, "properties", {
  active: { type: String },
  collapsed: { type: Boolean }
});
customElements.define("sidebar-navigation", pi);
class hi extends I {
  constructor() {
    super(), this.activeScreen = "home", this.monitorRunId = "";
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback(), window.addEventListener("screen-changed", (e) => {
      this.activeScreen = e.detail.screenId;
    });
  }
  _handleNavigation(e) {
    this.activeScreen = e, typeof window.switchScreen == "function" && window.switchScreen(e, !0);
  }
  render() {
    return p`
      <sidebar-navigation 
        .active="${this.activeScreen}"
        @navigate="${(e) => this._handleNavigation(e.detail)}">
      </sidebar-navigation>
    `;
  }
}
ye(hi, "properties", {
  activeScreen: { type: String },
  monitorRunId: { type: String }
});
customElements.define("harness-app", hi);
function a(o, e, t, i) {
  var r = arguments.length, n = r < 3 ? e : i === null ? i = Object.getOwnPropertyDescriptor(e, t) : i, s;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") n = Reflect.decorate(o, e, t, i);
  else for (var l = o.length - 1; l >= 0; l--) (s = o[l]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, t, n) : s(e, t)) || n);
  return r > 3 && n && Object.defineProperty(e, t, n), n;
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const te = (o) => (e, t) => {
  t !== void 0 ? t.addInitializer(() => {
    customElements.define(o, e);
  }) : customElements.define(o, e);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const eo = { attribute: !0, type: String, converter: We, reflect: !1, hasChanged: $t }, to = (o = eo, e, t) => {
  const { kind: i, metadata: r } = t;
  let n = globalThis.litPropertyMetadata.get(r);
  if (n === void 0 && globalThis.litPropertyMetadata.set(r, n = /* @__PURE__ */ new Map()), i === "setter" && ((o = Object.create(o)).wrapped = !0), n.set(t.name, o), i === "accessor") {
    const { name: s } = t;
    return { set(l) {
      const d = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(s, d, o, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(s, void 0, o, l), l;
    } };
  }
  if (i === "setter") {
    const { name: s } = t;
    return function(l) {
      const d = this[s];
      e.call(this, l), this.requestUpdate(s, d, o, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function c(o) {
  return (e, t) => typeof t == "object" ? to(o, e, t) : ((i, r, n) => {
    const s = r.hasOwnProperty(n);
    return r.constructor.createProperty(n, i), s ? Object.getOwnPropertyDescriptor(r, n) : void 0;
  })(o, e, t);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function z(o) {
  return c({ ...o, state: !0, attribute: !1 });
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Je = (o, e, t) => (t.configurable = !0, t.enumerable = !0, Reflect.decorate && typeof e != "object" && Object.defineProperty(o, e, t), t);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function F(o, e) {
  return (t, i, r) => {
    const n = (s) => {
      var l;
      return ((l = s.renderRoot) == null ? void 0 : l.querySelector(o)) ?? null;
    };
    return Je(t, i, { get() {
      return n(this);
    } });
  };
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
let io;
function oo(o) {
  return (e, t) => Je(e, t, { get() {
    return (this.renderRoot ?? io ?? (io = document.createDocumentFragment())).querySelectorAll(o);
  } });
}
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function ve(o) {
  return (e, t) => {
    const { slot: i, selector: r } = o ?? {}, n = "slot" + (i ? `[name=${i}]` : ":not([name])");
    return Je(e, t, { get() {
      var d;
      const s = (d = this.renderRoot) == null ? void 0 : d.querySelector(n), l = (s == null ? void 0 : s.assignedElements(o)) ?? [];
      return r === void 0 ? l : l.filter((m) => m.matches(r));
    } });
  };
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function ro(o) {
  return (e, t) => {
    const { slot: i } = o ?? {}, r = "slot" + (i ? `[name=${i}]` : ":not([name])");
    return Je(e, t, { get() {
      var s;
      const n = (s = this.renderRoot) == null ? void 0 : s.querySelector(r);
      return (n == null ? void 0 : n.assignedNodes(o)) ?? [];
    } });
  };
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ae = { ATTRIBUTE: 1, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4 }, Tt = (o) => (...e) => ({ _$litDirective$: o, values: e });
let At = class {
  constructor(e) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(e, t, i) {
    this._$Ct = e, this._$AM = t, this._$Ci = i;
  }
  _$AS(e, t) {
    return this.update(e, t);
  }
  update(e, t) {
    return this.render(...t);
  }
};
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ne = Tt(class extends At {
  constructor(o) {
    var e;
    if (super(o), o.type !== ae.ATTRIBUTE || o.name !== "class" || ((e = o.strings) == null ? void 0 : e.length) > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(o) {
    return " " + Object.keys(o).filter((e) => o[e]).join(" ") + " ";
  }
  update(o, [e]) {
    var i, r;
    if (this.st === void 0) {
      this.st = /* @__PURE__ */ new Set(), o.strings !== void 0 && (this.nt = new Set(o.strings.join(" ").split(/\s/).filter((n) => n !== "")));
      for (const n in e) e[n] && !((i = this.nt) != null && i.has(n)) && this.st.add(n);
      return this.render(e);
    }
    const t = o.element.classList;
    for (const n of this.st) n in e || (t.remove(n), this.st.delete(n));
    for (const n in e) {
      const s = !!e[n];
      s === this.st.has(n) || (r = this.nt) != null && r.has(n) || (s ? (t.add(n), this.st.add(n)) : (t.remove(n), this.st.delete(n)));
    }
    return G;
  }
});
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const _e = {
  STANDARD: "cubic-bezier(0.2, 0, 0, 1)",
  EMPHASIZED: "cubic-bezier(.3,0,0,1)",
  EMPHASIZED_ACCELERATE: "cubic-bezier(.3,0,.8,.15)"
};
function no() {
  let o = null;
  return {
    start() {
      return o == null || o.abort(), o = new AbortController(), o.signal;
    },
    finish() {
      o = null;
    }
  };
}
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class R extends I {
  constructor() {
    super(...arguments), this.disabled = !1, this.error = !1, this.focused = !1, this.label = "", this.noAsterisk = !1, this.populated = !1, this.required = !1, this.resizable = !1, this.supportingText = "", this.errorText = "", this.count = -1, this.max = -1, this.hasStart = !1, this.hasEnd = !1, this.isAnimating = !1, this.refreshErrorAlert = !1, this.disableTransitions = !1;
  }
  get counterText() {
    const e = this.count ?? -1, t = this.max ?? -1;
    return e < 0 || t <= 0 ? "" : `${e} / ${t}`;
  }
  get supportingOrErrorText() {
    return this.error && this.errorText ? this.errorText : this.supportingText;
  }
  /**
   * Re-announces the field's error supporting text to screen readers.
   *
   * Error text announces to screen readers anytime it is visible and changes.
   * Use the method to re-announce the message when the text has not changed,
   * but announcement is still needed (such as for `reportValidity()`).
   */
  reannounceError() {
    this.refreshErrorAlert = !0;
  }
  update(e) {
    e.has("disabled") && e.get("disabled") !== void 0 && (this.disableTransitions = !0), this.disabled && this.focused && (e.set("focused", !0), this.focused = !1), this.animateLabelIfNeeded({
      wasFocused: e.get("focused"),
      wasPopulated: e.get("populated")
    }), super.update(e);
  }
  render() {
    var n, s, l;
    const e = this.renderLabel(
      /*isFloating*/
      !0
    ), t = this.renderLabel(
      /*isFloating*/
      !1
    ), i = (n = this.renderOutline) == null ? void 0 : n.call(this, e), r = {
      disabled: this.disabled,
      "disable-transitions": this.disableTransitions,
      error: this.error && !this.disabled,
      focused: this.focused,
      "with-start": this.hasStart,
      "with-end": this.hasEnd,
      populated: this.populated,
      resizable: this.resizable,
      required: this.required,
      "no-label": !this.label
    };
    return p`
      <div class="field ${ne(r)}">
        <div class="container-overflow">
          ${(s = this.renderBackground) == null ? void 0 : s.call(this)} ${(l = this.renderIndicator) == null ? void 0 : l.call(this)} ${i}
          <div class="container">
            <div class="start">
              <slot name="start"></slot>
            </div>
            <div class="middle">
              <div class="label-wrapper">
                ${t} ${i ? b : e}
              </div>
              <div class="content">
                <slot></slot>
              </div>
            </div>
            <div class="end">
              <slot name="end"></slot>
            </div>
          </div>
        </div>
        ${this.renderSupportingText()}
      </div>
    `;
  }
  updated(e) {
    (e.has("supportingText") || e.has("errorText") || e.has("count") || e.has("max")) && this.updateSlottedAriaDescribedBy(), this.refreshErrorAlert && requestAnimationFrame(() => {
      this.refreshErrorAlert = !1;
    }), this.disableTransitions && requestAnimationFrame(() => {
      this.disableTransitions = !1;
    });
  }
  renderSupportingText() {
    const { supportingOrErrorText: e, counterText: t } = this;
    if (!e && !t)
      return b;
    const i = p`<span>${e}</span>`, r = t ? p`<span class="counter">${t}</span>` : b, s = this.error && this.errorText && !this.refreshErrorAlert ? "alert" : b;
    return p`
      <div class="supporting-text" role=${s}>${i}${r}</div>
      <slot
        name="aria-describedby"
        @slotchange=${this.updateSlottedAriaDescribedBy}></slot>
    `;
  }
  updateSlottedAriaDescribedBy() {
    for (const e of this.slottedAriaDescribedBy)
      St(p`${this.supportingOrErrorText} ${this.counterText}`, e), e.setAttribute("hidden", "");
  }
  renderLabel(e) {
    if (!this.label)
      return b;
    let t;
    e ? t = this.focused || this.populated || this.isAnimating : t = !this.focused && !this.populated && !this.isAnimating;
    const i = {
      hidden: !t,
      floating: e,
      resting: !e
    }, r = `${this.label}${this.required && !this.noAsterisk ? "*" : ""}`;
    return p`
      <span class="label ${ne(i)}" aria-hidden=${!t}
        >${r}</span
      >
    `;
  }
  animateLabelIfNeeded({ wasFocused: e, wasPopulated: t }) {
    var n, s, l;
    if (!this.label)
      return;
    e ?? (e = this.focused), t ?? (t = this.populated);
    const i = e || t, r = this.focused || this.populated;
    i !== r && (this.isAnimating = !0, (n = this.labelAnimation) == null || n.cancel(), this.labelAnimation = (s = this.floatingLabelEl) == null ? void 0 : s.animate(this.getLabelKeyframes(), { duration: 150, easing: _e.STANDARD }), (l = this.labelAnimation) == null || l.addEventListener("finish", () => {
      this.isAnimating = !1;
    }));
  }
  getLabelKeyframes() {
    const { floatingLabelEl: e, restingLabelEl: t } = this;
    if (!e || !t)
      return [];
    const { x: i, y: r, height: n } = e.getBoundingClientRect(), { x: s, y: l, height: d } = t.getBoundingClientRect(), m = e.scrollWidth, g = t.scrollWidth, u = g / m, v = s - i, y = l - r + Math.round((d - n * u) / 2), T = `translateX(${v}px) translateY(${y}px) scale(${u})`, A = "translateX(0) translateY(0) scale(1)", _ = t.clientWidth, $ = g > _ ? `${_ / u}px` : "";
    return this.focused || this.populated ? [
      { transform: T, width: $ },
      { transform: A, width: $ }
    ] : [
      { transform: A, width: $ },
      { transform: T, width: $ }
    ];
  }
  getSurfacePositionClientRect() {
    return this.containerEl.getBoundingClientRect();
  }
}
a([
  c({ type: Boolean })
], R.prototype, "disabled", void 0);
a([
  c({ type: Boolean })
], R.prototype, "error", void 0);
a([
  c({ type: Boolean })
], R.prototype, "focused", void 0);
a([
  c()
], R.prototype, "label", void 0);
a([
  c({ type: Boolean, attribute: "no-asterisk" })
], R.prototype, "noAsterisk", void 0);
a([
  c({ type: Boolean })
], R.prototype, "populated", void 0);
a([
  c({ type: Boolean })
], R.prototype, "required", void 0);
a([
  c({ type: Boolean })
], R.prototype, "resizable", void 0);
a([
  c({ attribute: "supporting-text" })
], R.prototype, "supportingText", void 0);
a([
  c({ attribute: "error-text" })
], R.prototype, "errorText", void 0);
a([
  c({ type: Number })
], R.prototype, "count", void 0);
a([
  c({ type: Number })
], R.prototype, "max", void 0);
a([
  c({ type: Boolean, attribute: "has-start" })
], R.prototype, "hasStart", void 0);
a([
  c({ type: Boolean, attribute: "has-end" })
], R.prototype, "hasEnd", void 0);
a([
  ve({ slot: "aria-describedby" })
], R.prototype, "slottedAriaDescribedBy", void 0);
a([
  z()
], R.prototype, "isAnimating", void 0);
a([
  z()
], R.prototype, "refreshErrorAlert", void 0);
a([
  z()
], R.prototype, "disableTransitions", void 0);
a([
  F(".label.floating")
], R.prototype, "floatingLabelEl", void 0);
a([
  F(".label.resting")
], R.prototype, "restingLabelEl", void 0);
a([
  F(".container")
], R.prototype, "containerEl", void 0);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class so extends R {
  renderOutline(e) {
    return p`
      <div class="outline">
        <div class="outline-start"></div>
        <div class="outline-notch">
          <div class="outline-panel-inactive"></div>
          <div class="outline-panel-active"></div>
          <div class="outline-label">${e}</div>
        </div>
        <div class="outline-end"></div>
      </div>
    `;
  }
}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ao = B`@layer styles{:host{--_bottom-space: var(--md-outlined-field-bottom-space, 16px);--_content-color: var(--md-outlined-field-content-color, var(--md-sys-color-on-surface, #1d1b20));--_content-font: var(--md-outlined-field-content-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_content-line-height: var(--md-outlined-field-content-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_content-size: var(--md-outlined-field-content-size, var(--md-sys-typescale-body-large-size, 1rem));--_content-weight: var(--md-outlined-field-content-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_disabled-content-color: var(--md-outlined-field-disabled-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-content-opacity: var(--md-outlined-field-disabled-content-opacity, 0.38);--_disabled-label-text-color: var(--md-outlined-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-outlined-field-disabled-label-text-opacity, 0.38);--_disabled-leading-content-color: var(--md-outlined-field-disabled-leading-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-content-opacity: var(--md-outlined-field-disabled-leading-content-opacity, 0.38);--_disabled-outline-color: var(--md-outlined-field-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-outline-opacity: var(--md-outlined-field-disabled-outline-opacity, 0.12);--_disabled-outline-width: var(--md-outlined-field-disabled-outline-width, 1px);--_disabled-supporting-text-color: var(--md-outlined-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-outlined-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-content-color: var(--md-outlined-field-disabled-trailing-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-content-opacity: var(--md-outlined-field-disabled-trailing-content-opacity, 0.38);--_error-content-color: var(--md-outlined-field-error-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-content-color: var(--md-outlined-field-error-focus-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-label-text-color: var(--md-outlined-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-content-color: var(--md-outlined-field-error-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-outline-color: var(--md-outlined-field-error-focus-outline-color, var(--md-sys-color-error, #b3261e));--_error-focus-supporting-text-color: var(--md-outlined-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-content-color: var(--md-outlined-field-error-focus-trailing-content-color, var(--md-sys-color-error, #b3261e));--_error-hover-content-color: var(--md-outlined-field-error-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-outlined-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-content-color: var(--md-outlined-field-error-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-outline-color: var(--md-outlined-field-error-hover-outline-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-supporting-text-color: var(--md-outlined-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-content-color: var(--md-outlined-field-error-hover-trailing-content-color, var(--md-sys-color-on-error-container, #410e0b));--_error-label-text-color: var(--md-outlined-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-content-color: var(--md-outlined-field-error-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-outline-color: var(--md-outlined-field-error-outline-color, var(--md-sys-color-error, #b3261e));--_error-supporting-text-color: var(--md-outlined-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-content-color: var(--md-outlined-field-error-trailing-content-color, var(--md-sys-color-error, #b3261e));--_focus-content-color: var(--md-outlined-field-focus-content-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-outlined-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-content-color: var(--md-outlined-field-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-outline-color: var(--md-outlined-field-focus-outline-color, var(--md-sys-color-primary, #6750a4));--_focus-outline-width: var(--md-outlined-field-focus-outline-width, 3px);--_focus-supporting-text-color: var(--md-outlined-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-content-color: var(--md-outlined-field-focus-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-content-color: var(--md-outlined-field-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-outlined-field-hover-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-leading-content-color: var(--md-outlined-field-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-outline-color: var(--md-outlined-field-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-outline-width: var(--md-outlined-field-hover-outline-width, 1px);--_hover-supporting-text-color: var(--md-outlined-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-content-color: var(--md-outlined-field-hover-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-color: var(--md-outlined-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-outlined-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-outlined-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-padding-bottom: var(--md-outlined-field-label-text-padding-bottom, 8px);--_label-text-populated-line-height: var(--md-outlined-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-outlined-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-outlined-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-outlined-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-content-color: var(--md-outlined-field-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-space: var(--md-outlined-field-leading-space, 16px);--_outline-color: var(--md-outlined-field-outline-color, var(--md-sys-color-outline, #79747e));--_outline-label-padding: var(--md-outlined-field-outline-label-padding, 4px);--_outline-width: var(--md-outlined-field-outline-width, 1px);--_supporting-text-color: var(--md-outlined-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-outlined-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-leading-space: var(--md-outlined-field-supporting-text-leading-space, 16px);--_supporting-text-line-height: var(--md-outlined-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-outlined-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-top-space: var(--md-outlined-field-supporting-text-top-space, 4px);--_supporting-text-trailing-space: var(--md-outlined-field-supporting-text-trailing-space, 16px);--_supporting-text-weight: var(--md-outlined-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_top-space: var(--md-outlined-field-top-space, 16px);--_trailing-content-color: var(--md-outlined-field-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-space: var(--md-outlined-field-trailing-space, 16px);--_container-shape-start-start: var(--md-outlined-field-container-shape-start-start, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-outlined-field-container-shape-start-end, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-outlined-field-container-shape-end-end, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-start: var(--md-outlined-field-container-shape-end-start, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)))}.outline{border-color:var(--_outline-color);border-radius:inherit;display:flex;pointer-events:none;height:100%;position:absolute;width:100%;z-index:1}.outline-start::before,.outline-start::after,.outline-panel-inactive::before,.outline-panel-inactive::after,.outline-panel-active::before,.outline-panel-active::after,.outline-end::before,.outline-end::after{border:inherit;content:"";inset:0;position:absolute}.outline-start,.outline-end{border:inherit;border-radius:inherit;box-sizing:border-box;position:relative}.outline-start::before,.outline-start::after,.outline-end::before,.outline-end::after{border-bottom-style:solid;border-top-style:solid}.outline-start::after,.outline-end::after{opacity:0;transition:opacity 150ms cubic-bezier(0.2, 0, 0, 1)}.focused .outline-start::after,.focused .outline-end::after{opacity:1}.outline-start::before,.outline-start::after{border-inline-start-style:solid;border-inline-end-style:none;border-start-start-radius:inherit;border-start-end-radius:0;border-end-start-radius:inherit;border-end-end-radius:0;margin-inline-end:var(--_outline-label-padding)}.outline-end{flex-grow:1;margin-inline-start:calc(-1*var(--_outline-label-padding))}.outline-end::before,.outline-end::after{border-inline-start-style:none;border-inline-end-style:solid;border-start-start-radius:0;border-start-end-radius:inherit;border-end-start-radius:0;border-end-end-radius:inherit}.outline-notch{align-items:flex-start;border:inherit;display:flex;margin-inline-start:calc(-1*var(--_outline-label-padding));margin-inline-end:var(--_outline-label-padding);max-width:calc(100% - var(--_leading-space) - var(--_trailing-space));padding:0 var(--_outline-label-padding);position:relative}.no-label .outline-notch{display:none}.outline-panel-inactive,.outline-panel-active{border:inherit;border-bottom-style:solid;inset:0;position:absolute}.outline-panel-inactive::before,.outline-panel-inactive::after,.outline-panel-active::before,.outline-panel-active::after{border-top-style:solid;border-bottom:none;bottom:auto;transform:scaleX(1);transition:transform 150ms cubic-bezier(0.2, 0, 0, 1)}.outline-panel-inactive::before,.outline-panel-active::before{right:50%;transform-origin:top left}.outline-panel-inactive::after,.outline-panel-active::after{left:50%;transform-origin:top right}.populated .outline-panel-inactive::before,.populated .outline-panel-inactive::after,.populated .outline-panel-active::before,.populated .outline-panel-active::after,.focused .outline-panel-inactive::before,.focused .outline-panel-inactive::after,.focused .outline-panel-active::before,.focused .outline-panel-active::after{transform:scaleX(0)}.outline-panel-active{opacity:0;transition:opacity 150ms cubic-bezier(0.2, 0, 0, 1)}.focused .outline-panel-active{opacity:1}.outline-label{display:flex;max-width:100%;transform:translateY(calc(-100% + var(--_label-text-padding-bottom)))}.outline-start,.field:not(.with-start) .content ::slotted(*){padding-inline-start:max(var(--_leading-space),max(var(--_container-shape-start-start),var(--_container-shape-end-start)) + var(--_outline-label-padding))}.field:not(.with-start) .label-wrapper{margin-inline-start:max(var(--_leading-space),max(var(--_container-shape-start-start),var(--_container-shape-end-start)) + var(--_outline-label-padding))}.field:not(.with-end) .content ::slotted(*){padding-inline-end:max(var(--_trailing-space),max(var(--_container-shape-start-end),var(--_container-shape-end-end)))}.field:not(.with-end) .label-wrapper{margin-inline-end:max(var(--_trailing-space),max(var(--_container-shape-start-end),var(--_container-shape-end-end)))}.outline-start::before,.outline-end::before,.outline-panel-inactive,.outline-panel-inactive::before,.outline-panel-inactive::after{border-width:var(--_outline-width)}:hover .outline{border-color:var(--_hover-outline-color);color:var(--_hover-outline-color)}:hover .outline-start::before,:hover .outline-end::before,:hover .outline-panel-inactive,:hover .outline-panel-inactive::before,:hover .outline-panel-inactive::after{border-width:var(--_hover-outline-width)}.focused .outline{border-color:var(--_focus-outline-color);color:var(--_focus-outline-color)}.outline-start::after,.outline-end::after,.outline-panel-active,.outline-panel-active::before,.outline-panel-active::after{border-width:var(--_focus-outline-width)}.disabled .outline{border-color:var(--_disabled-outline-color);color:var(--_disabled-outline-color)}.disabled .outline-start,.disabled .outline-end,.disabled .outline-panel-inactive{opacity:var(--_disabled-outline-opacity)}.disabled .outline-start::before,.disabled .outline-end::before,.disabled .outline-panel-inactive,.disabled .outline-panel-inactive::before,.disabled .outline-panel-inactive::after{border-width:var(--_disabled-outline-width)}.error .outline{border-color:var(--_error-outline-color);color:var(--_error-outline-color)}.error:hover .outline{border-color:var(--_error-hover-outline-color);color:var(--_error-hover-outline-color)}.error.focused .outline{border-color:var(--_error-focus-outline-color);color:var(--_error-focus-outline-color)}.resizable .container{bottom:var(--_focus-outline-width);inset-inline-end:var(--_focus-outline-width);clip-path:inset(var(--_focus-outline-width) 0 0 var(--_focus-outline-width))}.resizable .container>*{top:var(--_focus-outline-width);inset-inline-start:var(--_focus-outline-width)}.resizable .container:dir(rtl){clip-path:inset(var(--_focus-outline-width) var(--_focus-outline-width) 0 0)}}@layer hcm{@media(forced-colors: active){.disabled .outline{border-color:GrayText;color:GrayText}.disabled :is(.outline-start,.outline-end,.outline-panel-inactive){opacity:1}}}
`;
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const lo = B`:host{display:inline-flex;resize:both}.field{display:flex;flex:1;flex-direction:column;writing-mode:horizontal-tb;max-width:100%}.container-overflow{border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-end-radius:var(--_container-shape-end-end);border-end-start-radius:var(--_container-shape-end-start);display:flex;height:100%;position:relative}.container{align-items:center;border-radius:inherit;display:flex;flex:1;max-height:100%;min-height:100%;min-width:min-content;position:relative}.field,.container-overflow{resize:inherit}.resizable:not(.disabled) .container{resize:inherit;overflow:hidden}.disabled{pointer-events:none}@layer styles{.start,.middle,.end{display:flex;box-sizing:border-box;height:100%;position:relative}.start{color:var(--_leading-content-color)}.end{color:var(--_trailing-content-color)}.start,.end{align-items:center;justify-content:center}.with-start .start,.with-end .end{min-width:48px}.with-start .start{margin-inline-end:4px}.with-end .end{margin-inline-start:4px}.middle{align-items:stretch;align-self:baseline;flex:1}.content{color:var(--_content-color);display:flex;flex:1;opacity:0;transition:opacity 83ms cubic-bezier(0.2, 0, 0, 1)}.no-label .content,.focused .content,.populated .content{opacity:1;transition-delay:67ms}:is(.disabled,.disable-transitions) .content{transition:none}.content ::slotted(*){all:unset;color:currentColor;font-family:var(--_content-font);font-size:var(--_content-size);line-height:var(--_content-line-height);font-weight:var(--_content-weight);width:100%;overflow-wrap:revert;white-space:revert}.content ::slotted(:not(textarea)){padding-top:var(--_top-space);padding-bottom:var(--_bottom-space)}.content ::slotted(textarea){margin-top:var(--_top-space);margin-bottom:var(--_bottom-space)}:hover .content{color:var(--_hover-content-color)}:hover .start{color:var(--_hover-leading-content-color)}:hover .end{color:var(--_hover-trailing-content-color)}.focused .content{color:var(--_focus-content-color)}.focused .start{color:var(--_focus-leading-content-color)}.focused .end{color:var(--_focus-trailing-content-color)}.disabled .content{color:var(--_disabled-content-color)}.disabled.no-label .content,.disabled.focused .content,.disabled.populated .content{opacity:var(--_disabled-content-opacity)}.disabled .start{color:var(--_disabled-leading-content-color);opacity:var(--_disabled-leading-content-opacity)}.disabled .end{color:var(--_disabled-trailing-content-color);opacity:var(--_disabled-trailing-content-opacity)}.error .content{color:var(--_error-content-color)}.error .start{color:var(--_error-leading-content-color)}.error .end{color:var(--_error-trailing-content-color)}.error:hover .content{color:var(--_error-hover-content-color)}.error:hover .start{color:var(--_error-hover-leading-content-color)}.error:hover .end{color:var(--_error-hover-trailing-content-color)}.error.focused .content{color:var(--_error-focus-content-color)}.error.focused .start{color:var(--_error-focus-leading-content-color)}.error.focused .end{color:var(--_error-focus-trailing-content-color)}}@layer hcm{@media(forced-colors: active){.disabled :is(.start,.content,.end){color:GrayText;opacity:1}}}@layer styles{.label{box-sizing:border-box;color:var(--_label-text-color);overflow:hidden;max-width:100%;text-overflow:ellipsis;white-space:nowrap;z-index:1;font-family:var(--_label-text-font);font-size:var(--_label-text-size);line-height:var(--_label-text-line-height);font-weight:var(--_label-text-weight);width:min-content}.label-wrapper{inset:0;pointer-events:none;position:absolute}.label.resting{position:absolute;top:var(--_top-space)}.label.floating{font-size:var(--_label-text-populated-size);line-height:var(--_label-text-populated-line-height);transform-origin:top left}.label.hidden{opacity:0}.no-label .label{display:none}.label-wrapper{inset:0;position:absolute;text-align:initial}:hover .label{color:var(--_hover-label-text-color)}.focused .label{color:var(--_focus-label-text-color)}.disabled .label{color:var(--_disabled-label-text-color)}.disabled .label:not(.hidden){opacity:var(--_disabled-label-text-opacity)}.error .label{color:var(--_error-label-text-color)}.error:hover .label{color:var(--_error-hover-label-text-color)}.error.focused .label{color:var(--_error-focus-label-text-color)}}@layer hcm{@media(forced-colors: active){.disabled .label:not(.hidden){color:GrayText;opacity:1}}}@layer styles{.supporting-text{color:var(--_supporting-text-color);display:flex;font-family:var(--_supporting-text-font);font-size:var(--_supporting-text-size);line-height:var(--_supporting-text-line-height);font-weight:var(--_supporting-text-weight);gap:16px;justify-content:space-between;padding-inline-start:var(--_supporting-text-leading-space);padding-inline-end:var(--_supporting-text-trailing-space);padding-top:var(--_supporting-text-top-space)}.supporting-text :nth-child(2){flex-shrink:0}:hover .supporting-text{color:var(--_hover-supporting-text-color)}.focus .supporting-text{color:var(--_focus-supporting-text-color)}.disabled .supporting-text{color:var(--_disabled-supporting-text-color);opacity:var(--_disabled-supporting-text-opacity)}.error .supporting-text{color:var(--_error-supporting-text-color)}.error:hover .supporting-text{color:var(--_error-hover-supporting-text-color)}.error.focus .supporting-text{color:var(--_error-focus-supporting-text-color)}}@layer hcm{@media(forced-colors: active){.disabled .supporting-text{color:GrayText;opacity:1}}}
`;
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let lt = class extends so {
};
lt.styles = [lo, ao];
lt = a([
  te("md-outlined-field")
], lt);
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const mi = Symbol.for(""), co = (o) => {
  if ((o == null ? void 0 : o.r) === mi) return o == null ? void 0 : o._$litStatic$;
}, kt = (o, ...e) => ({ _$litStatic$: e.reduce((t, i, r) => t + ((n) => {
  if (n._$litStatic$ !== void 0) return n._$litStatic$;
  throw Error(`Value passed to 'literal' function must be a 'literal' result: ${n}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`);
})(i) + o[r + 1], o[0]), r: mi }), Xt = /* @__PURE__ */ new Map(), uo = (o) => (e, ...t) => {
  const i = t.length;
  let r, n;
  const s = [], l = [];
  let d, m = 0, g = !1;
  for (; m < i; ) {
    for (d = e[m]; m < i && (n = t[m], (r = co(n)) !== void 0); ) d += r + e[++m], g = !0;
    m !== i && l.push(n), s.push(d), m++;
  }
  if (m === i && s.push(e[i]), g) {
    const u = s.join("$$lit$$");
    (e = Xt.get(u)) === void 0 && (s.raw = s, Xt.set(u, e = s)), t = l;
  }
  return o(e, ...t);
}, fi = uo(p);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const po = B`:host{--_caret-color: var(--md-outlined-text-field-caret-color, var(--md-sys-color-primary, #6750a4));--_disabled-input-text-color: var(--md-outlined-text-field-disabled-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-input-text-opacity: var(--md-outlined-text-field-disabled-input-text-opacity, 0.38);--_disabled-label-text-color: var(--md-outlined-text-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-outlined-text-field-disabled-label-text-opacity, 0.38);--_disabled-leading-icon-color: var(--md-outlined-text-field-disabled-leading-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-icon-opacity: var(--md-outlined-text-field-disabled-leading-icon-opacity, 0.38);--_disabled-outline-color: var(--md-outlined-text-field-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-outline-opacity: var(--md-outlined-text-field-disabled-outline-opacity, 0.12);--_disabled-outline-width: var(--md-outlined-text-field-disabled-outline-width, 1px);--_disabled-supporting-text-color: var(--md-outlined-text-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-outlined-text-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-icon-color: var(--md-outlined-text-field-disabled-trailing-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-icon-opacity: var(--md-outlined-text-field-disabled-trailing-icon-opacity, 0.38);--_error-focus-caret-color: var(--md-outlined-text-field-error-focus-caret-color, var(--md-sys-color-error, #b3261e));--_error-focus-input-text-color: var(--md-outlined-text-field-error-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-label-text-color: var(--md-outlined-text-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-icon-color: var(--md-outlined-text-field-error-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-outline-color: var(--md-outlined-text-field-error-focus-outline-color, var(--md-sys-color-error, #b3261e));--_error-focus-supporting-text-color: var(--md-outlined-text-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-icon-color: var(--md-outlined-text-field-error-focus-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_error-hover-input-text-color: var(--md-outlined-text-field-error-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-outlined-text-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-icon-color: var(--md-outlined-text-field-error-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-outline-color: var(--md-outlined-text-field-error-hover-outline-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-supporting-text-color: var(--md-outlined-text-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-icon-color: var(--md-outlined-text-field-error-hover-trailing-icon-color, var(--md-sys-color-on-error-container, #410e0b));--_error-input-text-color: var(--md-outlined-text-field-error-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-label-text-color: var(--md-outlined-text-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-icon-color: var(--md-outlined-text-field-error-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-outline-color: var(--md-outlined-text-field-error-outline-color, var(--md-sys-color-error, #b3261e));--_error-supporting-text-color: var(--md-outlined-text-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-icon-color: var(--md-outlined-text-field-error-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_focus-input-text-color: var(--md-outlined-text-field-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-outlined-text-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-icon-color: var(--md-outlined-text-field-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-outline-color: var(--md-outlined-text-field-focus-outline-color, var(--md-sys-color-primary, #6750a4));--_focus-outline-width: var(--md-outlined-text-field-focus-outline-width, 3px);--_focus-supporting-text-color: var(--md-outlined-text-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-icon-color: var(--md-outlined-text-field-focus-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-input-text-color: var(--md-outlined-text-field-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-outlined-text-field-hover-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-leading-icon-color: var(--md-outlined-text-field-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-outline-color: var(--md-outlined-text-field-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-outline-width: var(--md-outlined-text-field-hover-outline-width, 1px);--_hover-supporting-text-color: var(--md-outlined-text-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-icon-color: var(--md-outlined-text-field-hover-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-color: var(--md-outlined-text-field-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_input-text-font: var(--md-outlined-text-field-input-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_input-text-line-height: var(--md-outlined-text-field-input-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_input-text-placeholder-color: var(--md-outlined-text-field-input-text-placeholder-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-prefix-color: var(--md-outlined-text-field-input-text-prefix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-size: var(--md-outlined-text-field-input-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_input-text-suffix-color: var(--md-outlined-text-field-input-text-suffix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-weight: var(--md-outlined-text-field-input-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_label-text-color: var(--md-outlined-text-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-outlined-text-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-outlined-text-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-populated-line-height: var(--md-outlined-text-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-outlined-text-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-outlined-text-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-outlined-text-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-icon-color: var(--md-outlined-text-field-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-icon-size: var(--md-outlined-text-field-leading-icon-size, 24px);--_outline-color: var(--md-outlined-text-field-outline-color, var(--md-sys-color-outline, #79747e));--_outline-width: var(--md-outlined-text-field-outline-width, 1px);--_supporting-text-color: var(--md-outlined-text-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-outlined-text-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-line-height: var(--md-outlined-text-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-outlined-text-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-weight: var(--md-outlined-text-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_trailing-icon-color: var(--md-outlined-text-field-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-icon-size: var(--md-outlined-text-field-trailing-icon-size, 24px);--_container-shape-start-start: var(--md-outlined-text-field-container-shape-start-start, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-outlined-text-field-container-shape-start-end, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-outlined-text-field-container-shape-end-end, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-start: var(--md-outlined-text-field-container-shape-end-start, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_leading-space: var(--md-outlined-text-field-leading-space, 16px);--_trailing-space: var(--md-outlined-text-field-trailing-space, 16px);--_top-space: var(--md-outlined-text-field-top-space, 16px);--_bottom-space: var(--md-outlined-text-field-bottom-space, 16px);--_input-text-prefix-trailing-space: var(--md-outlined-text-field-input-text-prefix-trailing-space, 2px);--_input-text-suffix-leading-space: var(--md-outlined-text-field-input-text-suffix-leading-space, 2px);--_focus-caret-color: var(--md-outlined-text-field-focus-caret-color, var(--md-sys-color-primary, #6750a4));--md-outlined-field-bottom-space: var(--_bottom-space);--md-outlined-field-container-shape-end-end: var(--_container-shape-end-end);--md-outlined-field-container-shape-end-start: var(--_container-shape-end-start);--md-outlined-field-container-shape-start-end: var(--_container-shape-start-end);--md-outlined-field-container-shape-start-start: var(--_container-shape-start-start);--md-outlined-field-content-color: var(--_input-text-color);--md-outlined-field-content-font: var(--_input-text-font);--md-outlined-field-content-line-height: var(--_input-text-line-height);--md-outlined-field-content-size: var(--_input-text-size);--md-outlined-field-content-weight: var(--_input-text-weight);--md-outlined-field-disabled-content-color: var(--_disabled-input-text-color);--md-outlined-field-disabled-content-opacity: var(--_disabled-input-text-opacity);--md-outlined-field-disabled-label-text-color: var(--_disabled-label-text-color);--md-outlined-field-disabled-label-text-opacity: var(--_disabled-label-text-opacity);--md-outlined-field-disabled-leading-content-color: var(--_disabled-leading-icon-color);--md-outlined-field-disabled-leading-content-opacity: var(--_disabled-leading-icon-opacity);--md-outlined-field-disabled-outline-color: var(--_disabled-outline-color);--md-outlined-field-disabled-outline-opacity: var(--_disabled-outline-opacity);--md-outlined-field-disabled-outline-width: var(--_disabled-outline-width);--md-outlined-field-disabled-supporting-text-color: var(--_disabled-supporting-text-color);--md-outlined-field-disabled-supporting-text-opacity: var(--_disabled-supporting-text-opacity);--md-outlined-field-disabled-trailing-content-color: var(--_disabled-trailing-icon-color);--md-outlined-field-disabled-trailing-content-opacity: var(--_disabled-trailing-icon-opacity);--md-outlined-field-error-content-color: var(--_error-input-text-color);--md-outlined-field-error-focus-content-color: var(--_error-focus-input-text-color);--md-outlined-field-error-focus-label-text-color: var(--_error-focus-label-text-color);--md-outlined-field-error-focus-leading-content-color: var(--_error-focus-leading-icon-color);--md-outlined-field-error-focus-outline-color: var(--_error-focus-outline-color);--md-outlined-field-error-focus-supporting-text-color: var(--_error-focus-supporting-text-color);--md-outlined-field-error-focus-trailing-content-color: var(--_error-focus-trailing-icon-color);--md-outlined-field-error-hover-content-color: var(--_error-hover-input-text-color);--md-outlined-field-error-hover-label-text-color: var(--_error-hover-label-text-color);--md-outlined-field-error-hover-leading-content-color: var(--_error-hover-leading-icon-color);--md-outlined-field-error-hover-outline-color: var(--_error-hover-outline-color);--md-outlined-field-error-hover-supporting-text-color: var(--_error-hover-supporting-text-color);--md-outlined-field-error-hover-trailing-content-color: var(--_error-hover-trailing-icon-color);--md-outlined-field-error-label-text-color: var(--_error-label-text-color);--md-outlined-field-error-leading-content-color: var(--_error-leading-icon-color);--md-outlined-field-error-outline-color: var(--_error-outline-color);--md-outlined-field-error-supporting-text-color: var(--_error-supporting-text-color);--md-outlined-field-error-trailing-content-color: var(--_error-trailing-icon-color);--md-outlined-field-focus-content-color: var(--_focus-input-text-color);--md-outlined-field-focus-label-text-color: var(--_focus-label-text-color);--md-outlined-field-focus-leading-content-color: var(--_focus-leading-icon-color);--md-outlined-field-focus-outline-color: var(--_focus-outline-color);--md-outlined-field-focus-outline-width: var(--_focus-outline-width);--md-outlined-field-focus-supporting-text-color: var(--_focus-supporting-text-color);--md-outlined-field-focus-trailing-content-color: var(--_focus-trailing-icon-color);--md-outlined-field-hover-content-color: var(--_hover-input-text-color);--md-outlined-field-hover-label-text-color: var(--_hover-label-text-color);--md-outlined-field-hover-leading-content-color: var(--_hover-leading-icon-color);--md-outlined-field-hover-outline-color: var(--_hover-outline-color);--md-outlined-field-hover-outline-width: var(--_hover-outline-width);--md-outlined-field-hover-supporting-text-color: var(--_hover-supporting-text-color);--md-outlined-field-hover-trailing-content-color: var(--_hover-trailing-icon-color);--md-outlined-field-label-text-color: var(--_label-text-color);--md-outlined-field-label-text-font: var(--_label-text-font);--md-outlined-field-label-text-line-height: var(--_label-text-line-height);--md-outlined-field-label-text-populated-line-height: var(--_label-text-populated-line-height);--md-outlined-field-label-text-populated-size: var(--_label-text-populated-size);--md-outlined-field-label-text-size: var(--_label-text-size);--md-outlined-field-label-text-weight: var(--_label-text-weight);--md-outlined-field-leading-content-color: var(--_leading-icon-color);--md-outlined-field-leading-space: var(--_leading-space);--md-outlined-field-outline-color: var(--_outline-color);--md-outlined-field-outline-width: var(--_outline-width);--md-outlined-field-supporting-text-color: var(--_supporting-text-color);--md-outlined-field-supporting-text-font: var(--_supporting-text-font);--md-outlined-field-supporting-text-line-height: var(--_supporting-text-line-height);--md-outlined-field-supporting-text-size: var(--_supporting-text-size);--md-outlined-field-supporting-text-weight: var(--_supporting-text-weight);--md-outlined-field-top-space: var(--_top-space);--md-outlined-field-trailing-content-color: var(--_trailing-icon-color);--md-outlined-field-trailing-space: var(--_trailing-space)}
`;
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ho = (o) => o.strings === void 0, mo = {}, fo = (o, e = mo) => o._$AH = e;
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Qt = Tt(class extends At {
  constructor(o) {
    if (super(o), o.type !== ae.PROPERTY && o.type !== ae.ATTRIBUTE && o.type !== ae.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
    if (!ho(o)) throw Error("`live` bindings can only contain a single expression");
  }
  render(o) {
    return o;
  }
  update(o, [e]) {
    if (e === G || e === b) return e;
    const t = o.element, i = o.name;
    if (o.type === ae.PROPERTY) {
      if (e === t[i]) return G;
    } else if (o.type === ae.BOOLEAN_ATTRIBUTE) {
      if (!!e === t.hasAttribute(i)) return G;
    } else if (o.type === ae.ATTRIBUTE && t.getAttribute(i) === e + "") return G;
    return fo(o), e;
  }
});
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const vi = "important", vo = " !" + vi, Ye = Tt(class extends At {
  constructor(o) {
    var e;
    if (super(o), o.type !== ae.ATTRIBUTE || o.name !== "style" || ((e = o.strings) == null ? void 0 : e.length) > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(o) {
    return Object.keys(o).reduce((e, t) => {
      const i = o[t];
      return i == null ? e : e + `${t = t.includes("-") ? t : t.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${i};`;
    }, "");
  }
  update(o, [e]) {
    const { style: t } = o.element;
    if (this.ft === void 0) return this.ft = new Set(Object.keys(e)), this.render(e);
    for (const i of this.ft) e[i] == null && (this.ft.delete(i), i.includes("-") ? t.removeProperty(i) : t[i] = null);
    for (const i in e) {
      const r = e[i];
      if (r != null) {
        this.ft.add(i);
        const n = typeof r == "string" && r.endsWith(vo);
        i.includes("-") || n ? t.setProperty(i, n ? r.slice(0, -11) : r, n ? vi : "") : t[i] = r;
      }
    }
    return G;
  }
});
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const gi = [
  "role",
  "ariaAtomic",
  "ariaAutoComplete",
  "ariaBusy",
  "ariaChecked",
  "ariaColCount",
  "ariaColIndex",
  "ariaColSpan",
  "ariaCurrent",
  "ariaDisabled",
  "ariaExpanded",
  "ariaHasPopup",
  "ariaHidden",
  "ariaInvalid",
  "ariaKeyShortcuts",
  "ariaLabel",
  "ariaLevel",
  "ariaLive",
  "ariaModal",
  "ariaMultiLine",
  "ariaMultiSelectable",
  "ariaOrientation",
  "ariaPlaceholder",
  "ariaPosInSet",
  "ariaPressed",
  "ariaReadOnly",
  "ariaRequired",
  "ariaRoleDescription",
  "ariaRowCount",
  "ariaRowIndex",
  "ariaRowSpan",
  "ariaSelected",
  "ariaSetSize",
  "ariaSort",
  "ariaValueMax",
  "ariaValueMin",
  "ariaValueNow",
  "ariaValueText"
];
gi.map(bi);
function bi(o) {
  return o.replace("aria", "aria-").replace(/Elements?/g, "").toLowerCase();
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Ze(o) {
  for (const e of gi)
    o.createProperty(e, {
      attribute: bi(e),
      reflect: !0
    });
  o.addInitializer((e) => {
    const t = {
      hostConnected() {
        e.setAttribute("role", "presentation");
      }
    };
    e.addController(t);
  });
}
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const go = {
  fromAttribute(o) {
    return o ?? "";
  },
  toAttribute(o) {
    return o || null;
  }
};
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function It(o, e) {
  e.bubbles && (!o.shadowRoot || e.composed) && e.stopPropagation();
  const t = Reflect.construct(e.constructor, [e.type, e]), i = o.dispatchEvent(t);
  return i || e.preventDefault(), i;
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Q = Symbol("internals"), rt = Symbol("privateInternals");
function Rt(o) {
  class e extends o {
    get [Q]() {
      return this[rt] || (this[rt] = this.attachInternals()), this[rt];
    }
  }
  return e;
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ze = Symbol("createValidator"), Pe = Symbol("getValidityAnchor"), nt = Symbol("privateValidator"), re = Symbol("privateSyncValidity"), Ue = Symbol("privateCustomValidationMessage");
function Ot(o) {
  var e;
  class t extends o {
    constructor() {
      super(...arguments), this[e] = "";
    }
    get validity() {
      return this[re](), this[Q].validity;
    }
    get validationMessage() {
      return this[re](), this[Q].validationMessage;
    }
    get willValidate() {
      return this[re](), this[Q].willValidate;
    }
    checkValidity() {
      return this[re](), this[Q].checkValidity();
    }
    reportValidity() {
      return this[re](), this[Q].reportValidity();
    }
    setCustomValidity(r) {
      this[Ue] = r, this[re]();
    }
    requestUpdate(r, n, s) {
      super.requestUpdate(r, n, s), this[re]();
    }
    firstUpdated(r) {
      super.firstUpdated(r), this[re]();
    }
    [(e = Ue, re)]() {
      this[nt] || (this[nt] = this[ze]());
      const { validity: r, validationMessage: n } = this[nt].getValidity(), s = !!this[Ue], l = this[Ue] || n;
      this[Q].setValidity({ ...r, customError: s }, l, this[Pe]() ?? void 0);
    }
    [ze]() {
      throw new Error("Implement [createValidator]");
    }
    [Pe]() {
      throw new Error("Implement [getValidityAnchor]");
    }
  }
  return t;
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const we = Symbol("getFormValue"), dt = Symbol("getFormState");
function zt(o) {
  class e extends o {
    get form() {
      return this[Q].form;
    }
    get labels() {
      return this[Q].labels;
    }
    // Use @property for the `name` and `disabled` properties to add them to the
    // `observedAttributes` array and trigger `attributeChangedCallback()`.
    //
    // We don't use Lit's default getter/setter (`noAccessor: true`) because
    // the attributes need to be updated synchronously to work with synchronous
    // form APIs, and Lit updates attributes async by default.
    get name() {
      return this.getAttribute("name") ?? "";
    }
    set name(i) {
      this.setAttribute("name", i);
    }
    get disabled() {
      return this.hasAttribute("disabled");
    }
    set disabled(i) {
      this.toggleAttribute("disabled", i);
    }
    attributeChangedCallback(i, r, n) {
      if (i === "name" || i === "disabled") {
        const s = i === "disabled" ? r !== null : r;
        this.requestUpdate(i, s);
        return;
      }
      super.attributeChangedCallback(i, r, n);
    }
    requestUpdate(i, r, n) {
      super.requestUpdate(i, r, n), this[Q].setFormValue(this[we](), this[dt]());
    }
    [we]() {
      throw new Error("Implement [getFormValue]");
    }
    [dt]() {
      return this[we]();
    }
    formDisabledCallback(i) {
      this.disabled = i;
    }
  }
  return e.formAssociated = !0, a([
    c({ noAccessor: !0 })
  ], e.prototype, "name", null), a([
    c({ type: Boolean, noAccessor: !0 })
  ], e.prototype, "disabled", null), e;
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Xe = Symbol("onReportValidity"), Be = Symbol("privateCleanupFormListeners"), Fe = Symbol("privateDoNotReportInvalid"), qe = Symbol("privateIsSelfReportingValidity"), He = Symbol("privateCallOnReportValidity");
function yi(o) {
  var e, t, i;
  class r extends o {
    // Mixins must have a constructor with `...args: any[]`
    // tslint:disable-next-line:no-any
    constructor(...s) {
      super(...s), this[e] = new AbortController(), this[t] = !1, this[i] = !1, this.addEventListener("invalid", (l) => {
        this[Fe] || !l.isTrusted || this.addEventListener("invalid", () => {
          this[He](l);
        }, { once: !0 });
      }, {
        // Listen during the capture phase, which will happen before the
        // bubbling phase. That way, we can add a final event listener that
        // will run after other event listeners, and we can check if it was
        // default prevented. This works because invalid does not bubble.
        capture: !0
      });
    }
    checkValidity() {
      this[Fe] = !0;
      const s = super.checkValidity();
      return this[Fe] = !1, s;
    }
    reportValidity() {
      this[qe] = !0;
      const s = super.reportValidity();
      return s && this[He](null), this[qe] = !1, s;
    }
    [(e = Be, t = Fe, i = qe, He)](s) {
      const l = s == null ? void 0 : s.defaultPrevented;
      l || (this[Xe](s), !(!l && (s == null ? void 0 : s.defaultPrevented))) || (this[qe] || xo(this[Q].form, this)) && this.focus();
    }
    [Xe](s) {
      throw new Error("Implement [onReportValidity]");
    }
    formAssociatedCallback(s) {
      super.formAssociatedCallback && super.formAssociatedCallback(s), this[Be].abort(), s && (this[Be] = new AbortController(), bo(this, s, () => {
        this[He](null);
      }, this[Be].signal));
    }
  }
  return r;
}
function bo(o, e, t, i) {
  const r = yo(e);
  let n = !1, s, l = !1;
  r.addEventListener("before", () => {
    l = !0, s = new AbortController(), n = !1, o.addEventListener("invalid", () => {
      n = !0;
    }, {
      signal: s.signal
    });
  }, { signal: i }), r.addEventListener("after", () => {
    l = !1, s == null || s.abort(), !n && t();
  }, { signal: i }), e.addEventListener("submit", () => {
    l || t();
  }, {
    signal: i
  });
}
const st = /* @__PURE__ */ new WeakMap();
function yo(o) {
  if (!st.has(o)) {
    const e = new EventTarget();
    st.set(o, e);
    for (const t of ["reportValidity", "requestSubmit"]) {
      const i = o[t];
      o[t] = function() {
        e.dispatchEvent(new Event("before"));
        const r = Reflect.apply(i, this, arguments);
        return e.dispatchEvent(new Event("after")), r;
      };
    }
  }
  return st.get(o);
}
function xo(o, e) {
  if (!o)
    return !0;
  let t;
  for (const i of o.elements)
    if (i.matches(":invalid")) {
      t = i;
      break;
    }
  return t === e;
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Pt {
  /**
   * Creates a new validator.
   *
   * @param getCurrentState A callback that returns the current state of
   *     constraint validation-related properties.
   */
  constructor(e) {
    this.getCurrentState = e, this.currentValidity = {
      validity: {},
      validationMessage: ""
    };
  }
  /**
   * Returns the current `ValidityStateFlags` and validation message for the
   * validator.
   *
   * If the constraint validation state has not changed, this will return a
   * cached result. This is important since `getValidity()` can be called
   * frequently in response to synchronous property changes.
   *
   * @return The current validity and validation message.
   */
  getValidity() {
    const e = this.getCurrentState();
    if (!(!this.prevState || !this.equals(this.prevState, e)))
      return this.currentValidity;
    const { validity: i, validationMessage: r } = this.computeValidity(e);
    return this.prevState = this.copy(e), this.currentValidity = {
      validationMessage: r,
      validity: {
        // Change any `ValidityState` instances into `ValidityStateFlags` since
        // `ValidityState` cannot be easily `{...spread}`.
        badInput: i.badInput,
        customError: i.customError,
        patternMismatch: i.patternMismatch,
        rangeOverflow: i.rangeOverflow,
        rangeUnderflow: i.rangeUnderflow,
        stepMismatch: i.stepMismatch,
        tooLong: i.tooLong,
        tooShort: i.tooShort,
        typeMismatch: i.typeMismatch,
        valueMissing: i.valueMissing
      }
    }, this.currentValidity;
  }
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class _o extends Pt {
  computeValidity({ state: e, renderedControl: t }) {
    let i = t;
    Se(e) && !i ? (i = this.inputControl || document.createElement("input"), this.inputControl = i) : i || (i = this.textAreaControl || document.createElement("textarea"), this.textAreaControl = i);
    const r = Se(e) ? i : null;
    if (r && (r.type = e.type), i.value !== e.value && (i.value = e.value), i.required = e.required, r) {
      const n = e;
      n.pattern ? r.pattern = n.pattern : r.removeAttribute("pattern"), n.min ? r.min = n.min : r.removeAttribute("min"), n.max ? r.max = n.max : r.removeAttribute("max"), n.step ? r.step = n.step : r.removeAttribute("step");
    }
    return (e.minLength ?? -1) > -1 ? i.setAttribute("minlength", String(e.minLength)) : i.removeAttribute("minlength"), (e.maxLength ?? -1) > -1 ? i.setAttribute("maxlength", String(e.maxLength)) : i.removeAttribute("maxlength"), {
      validity: i.validity,
      validationMessage: i.validationMessage
    };
  }
  equals({ state: e }, { state: t }) {
    const i = e.type === t.type && e.value === t.value && e.required === t.required && e.minLength === t.minLength && e.maxLength === t.maxLength;
    return !Se(e) || !Se(t) ? i : i && e.pattern === t.pattern && e.min === t.min && e.max === t.max && e.step === t.step;
  }
  copy({ state: e }) {
    return {
      state: Se(e) ? this.copyInput(e) : this.copyTextArea(e),
      renderedControl: null
    };
  }
  copyInput(e) {
    const { type: t, pattern: i, min: r, max: n, step: s } = e;
    return {
      ...this.copySharedState(e),
      type: t,
      pattern: i,
      min: r,
      max: n,
      step: s
    };
  }
  copyTextArea(e) {
    return {
      ...this.copySharedState(e),
      type: e.type
    };
  }
  copySharedState({ value: e, required: t, minLength: i, maxLength: r }) {
    return { value: e, required: t, minLength: i, maxLength: r };
  }
}
function Se(o) {
  return o.type !== "textarea";
}
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const wo = yi(Ot(zt(Rt(I))));
class C extends wo {
  constructor() {
    super(...arguments), this.error = !1, this.errorText = "", this.label = "", this.noAsterisk = !1, this.required = !1, this.value = "", this.prefixText = "", this.suffixText = "", this.hasLeadingIcon = !1, this.hasTrailingIcon = !1, this.supportingText = "", this.textDirection = "", this.rows = 2, this.cols = 20, this.inputMode = "", this.max = "", this.maxLength = -1, this.min = "", this.minLength = -1, this.noSpinner = !1, this.pattern = "", this.placeholder = "", this.readOnly = !1, this.multiple = !1, this.step = "", this.type = "text", this.autocomplete = "", this.dirty = !1, this.focused = !1, this.nativeError = !1, this.nativeErrorText = "";
  }
  /**
   * Gets or sets the direction in which selection occurred.
   */
  get selectionDirection() {
    return this.getInputOrTextarea().selectionDirection;
  }
  set selectionDirection(e) {
    this.getInputOrTextarea().selectionDirection = e;
  }
  /**
   * Gets or sets the end position or offset of a text selection.
   */
  get selectionEnd() {
    return this.getInputOrTextarea().selectionEnd;
  }
  set selectionEnd(e) {
    this.getInputOrTextarea().selectionEnd = e;
  }
  /**
   * Gets or sets the starting position or offset of a text selection.
   */
  get selectionStart() {
    return this.getInputOrTextarea().selectionStart;
  }
  set selectionStart(e) {
    this.getInputOrTextarea().selectionStart = e;
  }
  /**
   * The text field's value as a number.
   */
  get valueAsNumber() {
    const e = this.getInput();
    return e ? e.valueAsNumber : NaN;
  }
  set valueAsNumber(e) {
    const t = this.getInput();
    t && (t.valueAsNumber = e, this.value = t.value);
  }
  /**
   * The text field's value as a Date.
   */
  get valueAsDate() {
    const e = this.getInput();
    return e ? e.valueAsDate : null;
  }
  set valueAsDate(e) {
    const t = this.getInput();
    t && (t.valueAsDate = e, this.value = t.value);
  }
  get hasError() {
    return this.error || this.nativeError;
  }
  /**
   * Selects all the text in the text field.
   *
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/select
   */
  select() {
    this.getInputOrTextarea().select();
  }
  setRangeText(...e) {
    this.getInputOrTextarea().setRangeText(...e), this.value = this.getInputOrTextarea().value;
  }
  /**
   * Sets the start and end positions of a selection in the text field.
   *
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
   *
   * @param start The offset into the text field for the start of the selection.
   * @param end The offset into the text field for the end of the selection.
   * @param direction The direction in which the selection is performed.
   */
  setSelectionRange(e, t, i) {
    this.getInputOrTextarea().setSelectionRange(e, t, i);
  }
  /**
   * Decrements the value of a numeric type text field by `step` or `n` `step`
   * number of times.
   *
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/stepDown
   *
   * @param stepDecrement The number of steps to decrement, defaults to 1.
   */
  stepDown(e) {
    const t = this.getInput();
    t && (t.stepDown(e), this.value = t.value);
  }
  /**
   * Increments the value of a numeric type text field by `step` or `n` `step`
   * number of times.
   *
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/stepUp
   *
   * @param stepIncrement The number of steps to increment, defaults to 1.
   */
  stepUp(e) {
    const t = this.getInput();
    t && (t.stepUp(e), this.value = t.value);
  }
  /**
   * Reset the text field to its default value.
   */
  reset() {
    this.dirty = !1, this.value = this.getAttribute("value") ?? "", this.nativeError = !1, this.nativeErrorText = "";
  }
  attributeChangedCallback(e, t, i) {
    e === "value" && this.dirty || super.attributeChangedCallback(e, t, i);
  }
  render() {
    const e = {
      disabled: this.disabled,
      error: !this.disabled && this.hasError,
      textarea: this.type === "textarea",
      "no-spinner": this.noSpinner
    };
    return p`
      <span class="text-field ${ne(e)}">
        ${this.renderField()}
      </span>
    `;
  }
  updated(e) {
    const t = this.getInputOrTextarea().value;
    this.value !== t && (this.value = t);
  }
  renderField() {
    return fi`<${this.fieldTag}
      class="field"
      count=${this.value.length}
      ?disabled=${this.disabled}
      ?error=${this.hasError}
      error-text=${this.getErrorText()}
      ?focused=${this.focused}
      ?has-end=${this.hasTrailingIcon}
      ?has-start=${this.hasLeadingIcon}
      label=${this.label}
      ?no-asterisk=${this.noAsterisk}
      max=${this.maxLength}
      ?populated=${!!this.value}
      ?required=${this.required}
      ?resizable=${this.type === "textarea"}
      supporting-text=${this.supportingText}
    >
      ${this.renderLeadingIcon()}
      ${this.renderInputOrTextarea()}
      ${this.renderTrailingIcon()}
      <div id="description" slot="aria-describedby"></div>
    </${this.fieldTag}>`;
  }
  renderLeadingIcon() {
    return p`
      <span class="icon leading" slot="start">
        <slot name="leading-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `;
  }
  renderTrailingIcon() {
    return p`
      <span class="icon trailing" slot="end">
        <slot name="trailing-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `;
  }
  renderInputOrTextarea() {
    const e = { direction: this.textDirection }, t = this.ariaLabel || this.label || b, i = this.autocomplete, r = (this.maxLength ?? -1) > -1, n = (this.minLength ?? -1) > -1;
    if (this.type === "textarea")
      return p`
        <textarea
          class="input"
          style=${Ye(e)}
          aria-describedby="description"
          aria-invalid=${this.hasError}
          aria-label=${t}
          autocomplete=${i || b}
          name=${this.name || b}
          ?disabled=${this.disabled}
          maxlength=${r ? this.maxLength : b}
          minlength=${n ? this.minLength : b}
          placeholder=${this.placeholder || b}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          rows=${this.rows}
          cols=${this.cols}
          .value=${Qt(this.value)}
          @change=${this.redispatchEvent}
          @focus=${this.handleFocusChange}
          @blur=${this.handleFocusChange}
          @input=${this.handleInput}
          @select=${this.redispatchEvent}></textarea>
      `;
    const s = this.renderPrefix(), l = this.renderSuffix(), d = this.inputMode;
    return p`
      <div class="input-wrapper">
        ${s}
        <input
          class="input"
          style=${Ye(e)}
          aria-describedby="description"
          aria-invalid=${this.hasError}
          aria-label=${t}
          autocomplete=${i || b}
          name=${this.name || b}
          ?disabled=${this.disabled}
          inputmode=${d || b}
          max=${this.max || b}
          maxlength=${r ? this.maxLength : b}
          min=${this.min || b}
          minlength=${n ? this.minLength : b}
          pattern=${this.pattern || b}
          placeholder=${this.placeholder || b}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          ?multiple=${this.multiple}
          step=${this.step || b}
          type=${this.type}
          .value=${Qt(this.value)}
          @change=${this.redispatchEvent}
          @focus=${this.handleFocusChange}
          @blur=${this.handleFocusChange}
          @input=${this.handleInput}
          @select=${this.redispatchEvent} />
        ${l}
      </div>
    `;
  }
  renderPrefix() {
    return this.renderAffix(
      this.prefixText,
      /* isSuffix */
      !1
    );
  }
  renderSuffix() {
    return this.renderAffix(
      this.suffixText,
      /* isSuffix */
      !0
    );
  }
  renderAffix(e, t) {
    return e ? p`<span class="${ne({
      suffix: t,
      prefix: !t
    })}">${e}</span>` : b;
  }
  getErrorText() {
    return this.error ? this.errorText : this.nativeErrorText;
  }
  handleFocusChange() {
    var e;
    this.focused = ((e = this.inputOrTextarea) == null ? void 0 : e.matches(":focus")) ?? !1;
  }
  handleInput(e) {
    this.dirty = !0, this.value = e.target.value;
  }
  redispatchEvent(e) {
    It(this, e);
  }
  getInputOrTextarea() {
    return this.inputOrTextarea || (this.connectedCallback(), this.scheduleUpdate()), this.isUpdatePending && this.scheduleUpdate(), this.inputOrTextarea;
  }
  getInput() {
    return this.type === "textarea" ? null : this.getInputOrTextarea();
  }
  handleIconChange() {
    this.hasLeadingIcon = this.leadingIcons.length > 0, this.hasTrailingIcon = this.trailingIcons.length > 0;
  }
  [we]() {
    return this.value;
  }
  formResetCallback() {
    this.reset();
  }
  formStateRestoreCallback(e) {
    this.value = e;
  }
  focus() {
    this.getInputOrTextarea().focus();
  }
  [ze]() {
    return new _o(() => ({
      state: this,
      renderedControl: this.inputOrTextarea
    }));
  }
  [Pe]() {
    return this.inputOrTextarea;
  }
  [Xe](e) {
    var i;
    e == null || e.preventDefault();
    const t = this.getErrorText();
    this.nativeError = !!e, this.nativeErrorText = this.validationMessage, t === this.getErrorText() && ((i = this.field) == null || i.reannounceError());
  }
}
Ze(C);
C.shadowRootOptions = {
  ...I.shadowRootOptions,
  delegatesFocus: !0
};
a([
  c({ type: Boolean, reflect: !0 })
], C.prototype, "error", void 0);
a([
  c({ attribute: "error-text" })
], C.prototype, "errorText", void 0);
a([
  c()
], C.prototype, "label", void 0);
a([
  c({ type: Boolean, attribute: "no-asterisk" })
], C.prototype, "noAsterisk", void 0);
a([
  c({ type: Boolean, reflect: !0 })
], C.prototype, "required", void 0);
a([
  c()
], C.prototype, "value", void 0);
a([
  c({ attribute: "prefix-text" })
], C.prototype, "prefixText", void 0);
a([
  c({ attribute: "suffix-text" })
], C.prototype, "suffixText", void 0);
a([
  c({ type: Boolean, attribute: "has-leading-icon" })
], C.prototype, "hasLeadingIcon", void 0);
a([
  c({ type: Boolean, attribute: "has-trailing-icon" })
], C.prototype, "hasTrailingIcon", void 0);
a([
  c({ attribute: "supporting-text" })
], C.prototype, "supportingText", void 0);
a([
  c({ attribute: "text-direction" })
], C.prototype, "textDirection", void 0);
a([
  c({ type: Number })
], C.prototype, "rows", void 0);
a([
  c({ type: Number })
], C.prototype, "cols", void 0);
a([
  c({ reflect: !0 })
], C.prototype, "inputMode", void 0);
a([
  c()
], C.prototype, "max", void 0);
a([
  c({ type: Number })
], C.prototype, "maxLength", void 0);
a([
  c()
], C.prototype, "min", void 0);
a([
  c({ type: Number })
], C.prototype, "minLength", void 0);
a([
  c({ type: Boolean, attribute: "no-spinner" })
], C.prototype, "noSpinner", void 0);
a([
  c()
], C.prototype, "pattern", void 0);
a([
  c({ reflect: !0, converter: go })
], C.prototype, "placeholder", void 0);
a([
  c({ type: Boolean, reflect: !0 })
], C.prototype, "readOnly", void 0);
a([
  c({ type: Boolean, reflect: !0 })
], C.prototype, "multiple", void 0);
a([
  c()
], C.prototype, "step", void 0);
a([
  c({ reflect: !0 })
], C.prototype, "type", void 0);
a([
  c({ reflect: !0 })
], C.prototype, "autocomplete", void 0);
a([
  z()
], C.prototype, "dirty", void 0);
a([
  z()
], C.prototype, "focused", void 0);
a([
  z()
], C.prototype, "nativeError", void 0);
a([
  z()
], C.prototype, "nativeErrorText", void 0);
a([
  F(".input")
], C.prototype, "inputOrTextarea", void 0);
a([
  F(".field")
], C.prototype, "field", void 0);
a([
  ve({ slot: "leading-icon" })
], C.prototype, "leadingIcons", void 0);
a([
  ve({ slot: "trailing-icon" })
], C.prototype, "trailingIcons", void 0);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Co extends C {
  constructor() {
    super(...arguments), this.fieldTag = kt`md-outlined-field`;
  }
}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const $o = B`:host{display:inline-flex;outline:none;resize:both;text-align:start;-webkit-tap-highlight-color:rgba(0,0,0,0)}.text-field,.field{width:100%}.text-field{display:inline-flex}.field{cursor:text}.disabled .field{cursor:default}.text-field,.textarea .field{resize:inherit}.icon{color:currentColor;display:flex;fill:currentColor}.icon ::slotted(*){display:flex}[hasstart] .icon.leading{font-size:var(--_leading-icon-size);height:var(--_leading-icon-size);width:var(--_leading-icon-size)}[hasend] .icon.trailing{font-size:var(--_trailing-icon-size);height:var(--_trailing-icon-size);width:var(--_trailing-icon-size)}.input-wrapper{display:flex}.input-wrapper>*{all:inherit;padding:0}.input{caret-color:var(--_caret-color);overflow-x:hidden;text-align:inherit}.input::placeholder{color:currentColor;opacity:1}.input::-webkit-calendar-picker-indicator{display:none}.input::-webkit-search-decoration,.input::-webkit-search-cancel-button{display:none}@media(forced-colors: active){.input{background:none}}.no-spinner .input::-webkit-inner-spin-button,.no-spinner .input::-webkit-outer-spin-button{display:none}.no-spinner .input[type=number]{-moz-appearance:textfield}:focus-within .input{caret-color:var(--_focus-caret-color)}.error:focus-within .input{caret-color:var(--_error-focus-caret-color)}.text-field:not(.disabled) .prefix{color:var(--_input-text-prefix-color)}.text-field:not(.disabled) .suffix{color:var(--_input-text-suffix-color)}.text-field:not(.disabled) .input::placeholder{color:var(--_input-text-placeholder-color)}.prefix,.suffix{text-wrap:nowrap;width:min-content}.prefix{padding-inline-end:var(--_input-text-prefix-trailing-space)}.suffix{padding-inline-start:var(--_input-text-suffix-leading-space)}
`;
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let ct = class extends Co {
  constructor() {
    super(...arguments), this.fieldTag = kt`md-outlined-field`;
  }
};
ct.styles = [$o, po];
ct = a([
  te("md-outlined-text-field")
], ct);
function xi(o, e, t) {
  if (!o) return "";
  if (o.endsWith("-ds") || o.includes("-ds_") || o.includes("-ds-v") || o === "yahoo-gmail-ds" || o === "yahoo-calendar-ds")
    return `https://console.cloud.google.com/gemini-enterprise/locations/global/engines/${e}/collections/default_collection/data-stores/${o}/data/documents?project=${t}`;
  {
    const r = o.split("_google_drive")[0].split("_conversation")[0].split("_file")[0].split("_message")[0];
    return `https://console.cloud.google.com/gemini-enterprise/locations/global/engines/${e}/collections/${r}/connector/entities?project=${t}`;
  }
}
class _i extends I {
  constructor() {
    super(), this.scenarios = [], this.connectors = [], this.editingIdx = -1, this._draftScenario = null, this._connectorPage = 1;
  }
  createRenderRoot() {
    return this;
  }
  updated(e) {
    e.has("scenarios") && (this.editingIdx = -1, this._draftScenario = null);
  }
  _isValidUrl(e) {
    if (!e || typeof e != "string") return !1;
    const t = e.trim();
    if (!t) return !1;
    if (t.startsWith("http://") || t.startsWith("https://"))
      try {
        const i = new URL(t);
        return !!(i.hostname && i.hostname.includes("."));
      } catch {
        return !1;
      }
    return !1;
  }
  _canAddSourceLink() {
    const e = this._draftScenario.expected_source || [];
    if (e.length === 0) return !0;
    if (e.length >= 10) return !1;
    const t = e[e.length - 1];
    return this._isValidUrl(t);
  }
  _addEditorRow() {
    this._connectorPage = 1, this._draftScenario = {
      query: "",
      ground_truth: "",
      expected_source: [],
      connector_id: "",
      connector_scope: "all",
      connectors_enabled: !0,
      glean_response_text: "",
      glean_source_urls: ""
    }, this.editingIdx = this.scenarios.length;
  }
  _startEdit(e) {
    this._connectorPage = 1, this.editingIdx = e;
    const t = this.scenarios[e];
    if (!t) return;
    let i = !0, r = "all", n = "";
    t.connector_id === "none" ? (i = !1, r = "all", n = "") : t.connector_id === "all" || !t.connector_id ? (i = !0, r = "all", n = "") : (i = !0, r = "specific", n = t.connector_id);
    let s = [];
    Array.isArray(t.expected_source) ? s = [...t.expected_source] : typeof t.expected_source == "string" && t.expected_source.trim() && (s = [t.expected_source.trim()]), this._draftScenario = {
      query: t.query || "",
      ground_truth: t.ground_truth || "",
      expected_source: s,
      connector_id: n,
      connector_scope: r,
      connectors_enabled: i,
      glean_response_text: t.glean_response_text || "",
      glean_source_urls: t.glean_source_urls || ""
    };
  }
  _deleteEditorRow(e) {
    this.scenarios = this.scenarios.filter((t, i) => i !== e), this._notifyChange();
  }
  _copyEditorRow(e) {
    const t = this.scenarios[e];
    if (!t) return;
    const i = JSON.parse(JSON.stringify(t)), r = [...this.scenarios];
    r.splice(e + 1, 0, i), this.scenarios = r, this._notifyChange();
  }
  _cancelEdit() {
    this.editingIdx = -1, this._draftScenario = null;
  }
  _saveEdit() {
    if (!this._draftScenario.query.trim()) {
      alert("User Query is required!");
      return;
    }
    if ((this._draftScenario.expected_source || []).filter((n) => !this._isValidUrl(n)).length > 0) {
      alert("Cannot save: All Expected Source Links must be properly formatted HTTP or HTTPS URLs (e.g. starting with https:// or http://). Filenames and raw text are not allowed.");
      return;
    }
    let t = "all";
    if (!this._draftScenario.connectors_enabled)
      t = "none";
    else if (this._draftScenario.connector_scope === "all")
      t = "all";
    else {
      const n = this._draftScenario.connector_id;
      if (!n || !n.trim()) {
        alert("Cannot save: You selected 'Specify connector' but no connector is checked. Please select at least one specific connector below, or switch back to 'All Connectors'.");
        return;
      }
      t = n.trim();
    }
    const i = {
      query: this._draftScenario.query,
      ground_truth: this._draftScenario.ground_truth,
      expected_source: this._draftScenario.expected_source,
      connector_id: t,
      glean_response_text: this._draftScenario.glean_response_text,
      glean_source_urls: this._draftScenario.glean_source_urls
    }, r = [...this.scenarios];
    this.editingIdx === r.length ? r.push(i) : r[this.editingIdx] = i, this.scenarios = r, this.editingIdx = -1, this._draftScenario = null, this._notifyChange();
  }
  _onDraftQueryInput(e) {
    this._draftScenario.query = e.target.value;
  }
  _onDraftTruthInput(e) {
    this._draftScenario.ground_truth = e.target.value;
  }
  _onDraftSourceInput(e, t) {
    this._draftScenario.expected_source[e] = t.target.value.trim(), this.requestUpdate();
  }
  _addDraftSourceLink() {
    this._canAddSourceLink() && (Array.isArray(this._draftScenario.expected_source) || (this._draftScenario.expected_source = []), this._draftScenario.expected_source.push(""), this.requestUpdate());
  }
  _deleteDraftSourceLink(e) {
    this._draftScenario.expected_source.splice(e, 1), this.requestUpdate();
  }
  _onToggleConnectorsEnabled() {
    this._draftScenario.connectors_enabled = !this._draftScenario.connectors_enabled, this.requestUpdate();
  }
  _onChangeConnectorScope(e) {
    this._draftScenario.connector_scope = e.target.value, this._draftScenario.connector_scope === "all" && (this._draftScenario.connector_id = ""), this.requestUpdate();
  }
  _selectAllConnectors() {
    const e = this.connectors.map((t) => t.connector_id);
    this._draftScenario.connector_id = e.join(","), this.requestUpdate();
  }
  _clearAllConnectors() {
    this._draftScenario.connector_id = "", this.requestUpdate();
  }
  _isDraftConnChecked(e) {
    return this._draftScenario.connector_scope === "all" ? !0 : (this._draftScenario.connector_id || "").split(",").includes(e);
  }
  _onDraftConnItemChange(e) {
    const t = e.target.value, i = e.target.checked;
    let r = this._draftScenario.connector_id ? this._draftScenario.connector_id.split(",") : [];
    i ? r.includes(t) || r.push(t) : r = r.filter((n) => n !== t), this._draftScenario.connector_id = r.join(","), this.requestUpdate();
  }
  _getConnectorDropdownLabel(e) {
    if (!e || e === "all") return "All Connectors";
    if (e === "none") return "No Connectors";
    const t = e.split(",");
    if (t.length === 1) {
      const i = this.connectors.find((r) => r.connector_id === t[0]);
      return i ? i.display_name : t[0].split("_")[0];
    }
    return `${t.length} Selected`;
  }
  _notifyChange() {
    this.dispatchEvent(new CustomEvent("dataset-changed", {
      detail: { scenarios: this.scenarios },
      bubbles: !0,
      composed: !0
    }));
  }
  _renderReadOnlyTable() {
    return p`
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
          <h2 style="font-family: var(--font-display); font-size: 1.15rem;">Scenario Samples (Golden Dataset)</h2>
          <button class="btn btn-secondary btn-sm" id="btn-add-scenario" @click="${this._addEditorRow}">➕ Add Row</button>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 32%;">User Query</th>
                <th style="width: 32%;">Expected Ground Truth Answer</th>
                <th style="width: 18%;">Expected Source Links</th>
                <th style="width: 10%;">Connector ID</th>
                <th style="width: 8%;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${this.scenarios.length === 0 ? p`
                <tr>
                  <td colspan="5" style="text-align: center; color: var(--text-sub); padding: 1.25rem 0;">
                    No scenarios added yet. Click "➕ Add Row" to get started.
                  </td>
                </tr>
              ` : this.scenarios.map((e, t) => p`
                <tr>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem;">
                    <div style="font-size: 0.82rem; max-height: 60px; overflow-y: auto; white-space: pre-wrap; color: var(--text-main); font-weight: 500; line-height: 1.35;">${e.query || ""}</div>
                    ${e.glean_response_text || e.glean_source_urls ? p`
                      <span class="badge badge-glean" style="font-size: 0.65rem; margin-top: 0.25rem; padding: 0.1rem 0.4rem; text-transform: none; font-weight: normal; border-radius: 4px;">
                        📊 Glean Compare Configured
                      </span>
                    ` : ""}
                  </td>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem;">
                    <div style="font-size: 0.82rem; max-height: 60px; overflow-y: auto; white-space: pre-wrap; color: var(--text-main); line-height: 1.35;">${e.ground_truth || ""}</div>
                  </td>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                      ${(e.expected_source || []).map((i) => p`
                        <div style="font-size: 0.76rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 250px; color: var(--accent-primary);">
                          🔗 <a href="${i}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">${i}</a>
                        </div>
                      `)}
                    </div>
                  </td>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem;">
                    <span style="font-size: 0.8rem; color: var(--text-main); font-weight: 600;">
                      ${this._getConnectorDropdownLabel(e.connector_id)}
                    </span>
                  </td>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem; text-align: center;">
                    <div style="display: flex; flex-direction: column; gap: 0.2rem; align-items: center;">
                      <button class="btn btn-secondary btn-sm btn-edit-row" style="width: 100%; font-size: 0.7rem; padding: 0.18rem 0.4rem; white-space: nowrap;" @click="${() => this._startEdit(t)}">✏️ Edit</button>
                      <button class="btn btn-secondary btn-sm btn-copy-row" style="width: 100%; font-size: 0.7rem; padding: 0.18rem 0.4rem; white-space: nowrap;" @click="${() => this._copyEditorRow(t)}">📋 Copy</button>
                      <button class="btn btn-secondary btn-sm btn-delete-row" style="width: 100%; font-size: 0.7rem; padding: 0.18rem 0.4rem; color: var(--danger-color); white-space: nowrap;" @click="${() => this._deleteEditorRow(t)}">🗑️ Delete</button>
                    </div>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  _renderConnectorPagination(e) {
    const i = Math.ceil(e / 10);
    return i <= 1 ? "" : p`
      <div style="display: flex; justify-content: center; align-items: center; gap: 0.75rem; margin-top: 0.75rem; font-size: 0.82rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
        <button class="btn btn-secondary btn-sm" ?disabled="${this._connectorPage === 1}" @click="${() => {
      this._connectorPage--, this.requestUpdate();
    }}">◀ Prev</button>
        <span style="color: var(--text-sub);">Page <b>${this._connectorPage}</b> of ${i}</span>
        <button class="btn btn-secondary btn-sm" ?disabled="${this._connectorPage === i}" @click="${() => {
      this._connectorPage++, this.requestUpdate();
    }}">Next ▶</button>
      </div>
    `;
  }
  _renderFocusedEditor() {
    const e = this.editingIdx === this.scenarios.length, t = window.GCP_PROJECT_ID || "", i = window.GCP_ENGINE_ID || "", r = this._draftScenario.connectors_enabled, n = this._draftScenario.connector_scope === "specific", s = 10, l = this.connectors.slice((this._connectorPage - 1) * s, this._connectorPage * s);
    return p`
      <div class="card" id="focused-scenario-editor" style="border: 1px solid var(--accent-primary); box-shadow: 0 1px 3px 0 rgba(60,64,67,0.15), 0 4px 8px 3px rgba(60,64,67,0.06);">
        <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 0.85rem; color: var(--text-main);">
          ${e ? "➕ Add Dataset Scenario Sample" : "✏️ Edit Dataset Scenario Sample"}
        </h2>

        <!-- Query -->
        <div style="margin-bottom: 0.85rem;">
          <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">User Query:</label>
          <textarea
            id="focused-query"
            rows="3"
            maxlength="10000"
            placeholder="Type the query scenario to test..."
            .value="${this._draftScenario.query || ""}"
            @input="${this._onDraftQueryInput}"
            style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s; resize: vertical;"
            onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
            onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
          ></textarea>
        </div>

        <!-- Ground Truth -->
        <div style="margin-bottom: 0.85rem;">
          <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Expected Answer (Ground Truth):</label>
          <textarea
            id="focused-truth"
            rows="3"
            maxlength="10000"
            placeholder="Type the reference answer/fact to judge evaluation..."
            .value="${this._draftScenario.ground_truth || ""}"
            @input="${this._onDraftTruthInput}"
            style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s; resize: vertical;"
            onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
            onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
          ></textarea>
        </div>

        <!-- Expected Source Links -->
        <div style="margin-bottom: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); text-transform: uppercase;">Expected Source Links:</label>
            ${this._canAddSourceLink() ? p`
              <button class="btn btn-secondary btn-sm" id="focused-add-link" @click="${this._addDraftSourceLink}">➕ Add Link</button>
            ` : p`
              <button class="btn btn-secondary btn-sm" id="focused-add-link" disabled style="opacity: 0.5; cursor: not-allowed;" title="Enter a valid URL in the current field first.">➕ Add Link</button>
            `}
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${(this._draftScenario.expected_source || []).map((d, m) => p`
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <input
                  type="text"
                  class="focused-src-input"
                  data-idx="${m}"
                  placeholder="https://drive.google.com/... (Must be a valid HTTP or HTTPS URL)"
                  .value="${d}"
                  @input="${(g) => this._onDraftSourceInput(m, g)}"
                  style="flex: 1; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.45rem 0.65rem; font-family: inherit; font-size: 0.82rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s;"
                  onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
                  onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
                />
                
                <!-- URL / Source Validation Checkmark Status -->
                <span style="font-size: 1rem; width: 22px; text-align: center;">
                  ${this._isValidUrl(d) ? p`<span style="color: var(--success-color);" title="Valid HTTP/HTTPS URL">✔️</span>` : d ? p`<span style="color: var(--danger-color);" title="Invalid format: Must be a valid HTTP or HTTPS URL">❌</span>` : ""}
                </span>
                
                <button class="btn btn-secondary btn-sm" style="color: var(--danger-color); padding: 0.25rem 0.5rem;" @click="${() => this._deleteDraftSourceLink(m)}">✕</button>
              </div>
            `)}
            ${!this._draftScenario.expected_source || this._draftScenario.expected_source.length === 0 ? p`
              <div style="color: var(--text-sub); font-size: 0.8rem; font-style: italic; padding: 0.25rem 0;">No expected sources defined.</div>
            ` : ""}
          </div>
        </div>

        <!-- Glean Comparison Option (Optional) -->
        <div style="margin-top: 0.85rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem; margin-bottom: 0.85rem;">
          <h3 style="font-family: var(--font-display); font-size: 0.92rem; margin-bottom: 0.5rem; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">Glean Comparison (Optional)</h3>
          
          <div style="margin-bottom: 0.65rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Glean Response Text:</label>
            <textarea
              id="focused-glean-response"
              rows="3"
              placeholder="Paste the response returned by Glean to grade and compare..."
              .value="${this._draftScenario.glean_response_text || ""}"
              @input="${(d) => {
      this._draftScenario.glean_response_text = d.target.value;
    }}"
              style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s; resize: vertical;"
              onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
              onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
            ></textarea>
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Glean Source URLs:</label>
            <input
              type="text"
              id="focused-glean-sources"
              placeholder="Paste one or more Glean sources (separated by commas or newlines)..."
              .value="${this._draftScenario.glean_source_urls || ""}"
              @input="${(d) => {
      this._draftScenario.glean_source_urls = d.target.value;
    }}"
              style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.45rem 0.65rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s;"
              onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
              onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
            />
          </div>
        </div>

        <!-- Applicable Connectors Section -->
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); text-transform: uppercase;">Applicable Data Connectors:</label>
            
            <!-- Sliding Switch Widget (Yes/No) -->
            <label class="switch-container" id="conn-enabled-switch" style="display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer;" @click="${this._onToggleConnectorsEnabled}">
              <span style="font-weight: 500; font-size: 0.8rem; color: var(--text-sub);">Enable Data Connectors:</span>
              <div style="position: relative; width: 38px; height: 20px; background: ${r ? "var(--accent-primary)" : "var(--input-border)"}; border-radius: 100px; transition: background 0.25s;">
                <div style="position: absolute; top: 2px; left: ${r ? "20px" : "2px"}; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: left 0.25s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
              </div>
              <span style="font-weight: bold; font-size: 0.8rem; color: ${r ? "var(--accent-primary)" : "var(--text-sub)"}; width: 28px;">
                ${r ? "YES" : "NO"}
              </span>
            </label>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-sub); margin-bottom: 0.5rem; line-height: 1.35;">
            The list below shows the active data stores available for this evaluation harness. 
            The name shown is the unique data store ID.
            Click the link next to each connector to view its documents in the <a href="https://console.cloud.google.com/gemini-enterprise/locations/global/engines/${i}/connector?project=${t}" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">Google Cloud Console Data Store Page</a>.
          </div>

          <!-- Scope Radio Buttons (only active when enabled is true) -->
          <div style="display: flex; gap: 1.5rem; margin-bottom: 0.65rem; opacity: ${r ? "1" : "0.35"}; pointer-events: ${r ? "auto" : "none"}; transition: all 0.25s;">
            <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; color: var(--text-main); font-size: 0.84rem;">
              <input type="radio" name="connector-scope" id="scope-all" value="all" ?checked="${this._draftScenario.connector_scope === "all"}" @change="${this._onChangeConnectorScope}">
              <span style="color: var(--text-main);"><b>All Connectors (Dynamic)</b></span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; color: var(--text-main); font-size: 0.84rem;">
              <input type="radio" name="connector-scope" id="scope-specific" value="specific" ?checked="${n}" @change="${this._onChangeConnectorScope}">
              <span style="color: var(--text-main);"><b>Select Specific Connectors</b></span>
            </label>
          </div>

          <!-- Connectors Tabular Selection List -->
          <div style="display: flex; flex-direction: column; background: var(--bg-card-secondary); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); max-height: 280px; overflow-y: auto; opacity: ${r ? "1" : "0.35"}; pointer-events: ${r ? "auto" : "none"}; transition: all 0.25s;">
            
            <!-- Helper Quick Links -->
            ${n && r ? p`
              <div style="display: flex; gap: 0.75rem; font-size: 0.76rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.35rem; margin-bottom: 0.35rem;">
                <span style="color: var(--text-sub);">Quick actions:</span>
                <span style="color: var(--accent-primary); cursor: pointer; text-decoration: underline;" @click="${this._selectAllConnectors}">Select All</span>
                <span style="color: var(--accent-primary); cursor: pointer; text-decoration: underline;" @click="${this._clearAllConnectors}">Clear Selection</span>
              </div>
            ` : ""}

            <!-- Validation Error Warning if no connector selected in specific scope -->
            ${n && r && (!this._draftScenario.connector_id || !this._draftScenario.connector_id.trim()) ? p`
              <div style="margin-bottom: 0.5rem; padding: 0.45rem 0.75rem; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; color: var(--danger-color); font-size: 0.78rem; font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
                <span>⚠️ Error: You must select at least one specific connector from the list below before you can save.</span>
              </div>
            ` : ""}

            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-sub);">
                  <th style="padding: 0.3rem 0.5rem; width: 80%;">Connector ID</th>
                  <th style="padding: 0.3rem 0.5rem; width: 20%; text-align: right;">Console Link</th>
                </tr>
              </thead>
              <tbody>
                ${l.length === 0 ? p`
                  <tr>
                    <td colspan="2" style="text-align: center; color: var(--text-sub); padding: 1rem 0;">
                      No connectors loaded.
                    </td>
                  </tr>
                ` : l.map((d) => {
      const m = xi(d.connector_id, i, t), g = this._isDraftConnChecked(d.connector_id), u = !r || !n;
      return p`
                    <tr style="border-bottom: 1px solid var(--border-color);">
                      <td style="padding: 0.3rem 0.5rem; vertical-align: middle;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: ${u ? "default" : "pointer"}; color: var(--text-main);">
                          <input type="checkbox" class="focused-conn-item-cb" value="${d.connector_id}" ?checked="${g}" ?disabled="${u}" @change="${this._onDraftConnItemChange}">
                          <code style="font-size: 0.8rem; color: var(--code-text); background: var(--code-bg); padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 600;">${d.connector_id}</code>
                        </label>
                      </td>
                      <td style="padding: 0.3rem 0.5rem; vertical-align: middle; text-align: right;">
                        <a href="${m}" target="_blank" style="font-size: 0.75rem; color: var(--accent-primary); text-decoration: underline;">
                          Console Page ↗
                        </a>
                      </td>
                    </tr>
                  `;
    })}
              </tbody>
            </table>

            ${this._renderConnectorPagination(this.connectors.length)}
          </div>
        </div>

        <!-- Control Buttons -->
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button class="btn btn-secondary" id="btn-cancel-edit" @click="${this._cancelEdit}">Cancel</button>
          <button class="btn btn-primary" id="btn-save-edit" ?disabled="${n && r && (!this._draftScenario.connector_id || !this._draftScenario.connector_id.trim())}" @click="${this._saveEdit}">Save</button>
        </div>
      </div>
    `;
  }
  render() {
    return this.editingIdx >= 0 ? this._renderFocusedEditor() : this._renderReadOnlyTable();
  }
}
ye(_i, "properties", {
  scenarios: { type: Array },
  connectors: { type: Array },
  editingIdx: { type: Number },
  _draftScenario: { type: Object },
  _connectorPage: { type: Number }
});
customElements.define("dataset-editor", _i);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const wi = Symbol("attachableController");
let Ge;
Ge = new MutationObserver((o) => {
  var e;
  for (const t of o)
    (e = t.target[wi]) == null || e.hostConnected();
});
class Ci {
  get htmlFor() {
    return this.host.getAttribute("for");
  }
  set htmlFor(e) {
    e === null ? this.host.removeAttribute("for") : this.host.setAttribute("for", e);
  }
  get control() {
    return this.host.hasAttribute("for") ? !this.htmlFor || !this.host.isConnected ? null : this.host.getRootNode().querySelector(`#${this.htmlFor}`) : this.currentControl || this.host.parentElement;
  }
  set control(e) {
    e ? this.attach(e) : this.detach();
  }
  /**
   * Creates a new controller for an `Attachable` element.
   *
   * @param host The `Attachable` element.
   * @param onControlChange A callback with two parameters for the previous and
   *     next control. An `Attachable` element may perform setup or teardown
   *     logic whenever the control changes.
   */
  constructor(e, t) {
    this.host = e, this.onControlChange = t, this.currentControl = null, e.addController(this), e[wi] = this, Ge == null || Ge.observe(e, { attributeFilter: ["for"] });
  }
  attach(e) {
    e !== this.currentControl && (this.setCurrentControl(e), this.host.removeAttribute("for"));
  }
  detach() {
    this.setCurrentControl(null), this.host.setAttribute("for", "");
  }
  /** @private */
  hostConnected() {
    this.setCurrentControl(this.control);
  }
  /** @private */
  hostDisconnected() {
    this.setCurrentControl(null);
  }
  setCurrentControl(e) {
    this.onControlChange(this.currentControl, e), this.currentControl = e;
  }
}
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Eo = ["focusin", "focusout", "pointerdown"];
class Lt extends I {
  constructor() {
    super(...arguments), this.visible = !1, this.inward = !1, this.attachableController = new Ci(this, this.onControlChange.bind(this));
  }
  get htmlFor() {
    return this.attachableController.htmlFor;
  }
  set htmlFor(e) {
    this.attachableController.htmlFor = e;
  }
  get control() {
    return this.attachableController.control;
  }
  set control(e) {
    this.attachableController.control = e;
  }
  attach(e) {
    this.attachableController.attach(e);
  }
  detach() {
    this.attachableController.detach();
  }
  connectedCallback() {
    super.connectedCallback(), this.setAttribute("aria-hidden", "true");
  }
  /** @private */
  handleEvent(e) {
    var t;
    if (!e[Jt]) {
      switch (e.type) {
        default:
          return;
        case "focusin":
          this.visible = ((t = this.control) == null ? void 0 : t.matches(":focus-visible")) ?? !1;
          break;
        case "focusout":
        case "pointerdown":
          this.visible = !1;
          break;
      }
      e[Jt] = !0;
    }
  }
  onControlChange(e, t) {
    for (const i of Eo)
      e == null || e.removeEventListener(i, this), t == null || t.addEventListener(i, this);
  }
  update(e) {
    e.has("visible") && this.dispatchEvent(new Event("visibility-changed")), super.update(e);
  }
}
a([
  c({ type: Boolean, reflect: !0 })
], Lt.prototype, "visible", void 0);
a([
  c({ type: Boolean, reflect: !0 })
], Lt.prototype, "inward", void 0);
const Jt = Symbol("handledByFocusRing");
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const So = B`:host{animation-delay:0s,calc(var(--md-focus-ring-duration, 600ms)*.25);animation-duration:calc(var(--md-focus-ring-duration, 600ms)*.25),calc(var(--md-focus-ring-duration, 600ms)*.75);animation-timing-function:cubic-bezier(0.2, 0, 0, 1);box-sizing:border-box;color:var(--md-focus-ring-color, var(--md-sys-color-secondary, #625b71));display:none;pointer-events:none;position:absolute}:host([visible]){display:flex}:host(:not([inward])){animation-name:outward-grow,outward-shrink;border-end-end-radius:calc(var(--md-focus-ring-shape-end-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-end-start-radius:calc(var(--md-focus-ring-shape-end-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-start-end-radius:calc(var(--md-focus-ring-shape-start-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-start-start-radius:calc(var(--md-focus-ring-shape-start-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));inset:calc(-1*var(--md-focus-ring-outward-offset, 2px));outline:var(--md-focus-ring-width, 3px) solid currentColor}:host([inward]){animation-name:inward-grow,inward-shrink;border-end-end-radius:calc(var(--md-focus-ring-shape-end-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-end-start-radius:calc(var(--md-focus-ring-shape-end-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-start-end-radius:calc(var(--md-focus-ring-shape-start-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-start-start-radius:calc(var(--md-focus-ring-shape-start-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border:var(--md-focus-ring-width, 3px) solid currentColor;inset:var(--md-focus-ring-inward-offset, 0px)}@keyframes outward-grow{from{outline-width:0}to{outline-width:var(--md-focus-ring-active-width, 8px)}}@keyframes outward-shrink{from{outline-width:var(--md-focus-ring-active-width, 8px)}}@keyframes inward-grow{from{border-width:0}to{border-width:var(--md-focus-ring-active-width, 8px)}}@keyframes inward-shrink{from{border-width:var(--md-focus-ring-active-width, 8px)}}@media(prefers-reduced-motion){:host{animation:none}}
`;
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let ut = class extends Lt {
};
ut.styles = [So];
ut = a([
  te("md-focus-ring")
], ut);
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const To = 450, Zt = 225, Ao = 0.2, ko = 10, Io = 75, Ro = 0.35, Oo = "::after", zo = "forwards";
var M;
(function(o) {
  o[o.INACTIVE = 0] = "INACTIVE", o[o.TOUCH_DELAY = 1] = "TOUCH_DELAY", o[o.HOLDING = 2] = "HOLDING", o[o.WAITING_FOR_CLICK = 3] = "WAITING_FOR_CLICK";
})(M || (M = {}));
const Po = [
  "click",
  "contextmenu",
  "pointercancel",
  "pointerdown",
  "pointerenter",
  "pointerleave",
  "pointerup"
], Lo = 150, at = window.matchMedia("(forced-colors: active)");
class Me extends I {
  constructor() {
    super(...arguments), this.disabled = !1, this.hovered = !1, this.pressed = !1, this.rippleSize = "", this.rippleScale = "", this.initialSize = 0, this.state = M.INACTIVE, this.checkBoundsAfterContextMenu = !1, this.attachableController = new Ci(this, this.onControlChange.bind(this));
  }
  get htmlFor() {
    return this.attachableController.htmlFor;
  }
  set htmlFor(e) {
    this.attachableController.htmlFor = e;
  }
  get control() {
    return this.attachableController.control;
  }
  set control(e) {
    this.attachableController.control = e;
  }
  attach(e) {
    this.attachableController.attach(e);
  }
  detach() {
    this.attachableController.detach();
  }
  connectedCallback() {
    super.connectedCallback(), this.setAttribute("aria-hidden", "true");
  }
  render() {
    const e = {
      hovered: this.hovered,
      pressed: this.pressed
    };
    return p`<div class="surface ${ne(e)}"></div>`;
  }
  update(e) {
    e.has("disabled") && this.disabled && (this.hovered = !1, this.pressed = !1), super.update(e);
  }
  /**
   * TODO(b/269799771): make private
   * @private only public for slider
   */
  handlePointerenter(e) {
    this.shouldReactToEvent(e) && (this.hovered = !0);
  }
  /**
   * TODO(b/269799771): make private
   * @private only public for slider
   */
  handlePointerleave(e) {
    this.shouldReactToEvent(e) && (this.hovered = !1, this.state !== M.INACTIVE && this.endPressAnimation());
  }
  handlePointerup(e) {
    if (this.shouldReactToEvent(e)) {
      if (this.state === M.HOLDING) {
        this.state = M.WAITING_FOR_CLICK;
        return;
      }
      if (this.state === M.TOUCH_DELAY) {
        this.state = M.WAITING_FOR_CLICK, this.startPressAnimation(this.rippleStartEvent);
        return;
      }
    }
  }
  async handlePointerdown(e) {
    if (this.shouldReactToEvent(e)) {
      if (this.rippleStartEvent = e, !this.isTouch(e)) {
        this.state = M.WAITING_FOR_CLICK, this.startPressAnimation(e);
        return;
      }
      this.checkBoundsAfterContextMenu && !this.inBounds(e) || (this.checkBoundsAfterContextMenu = !1, this.state = M.TOUCH_DELAY, await new Promise((t) => {
        setTimeout(t, Lo);
      }), this.state === M.TOUCH_DELAY && (this.state = M.HOLDING, this.startPressAnimation(e)));
    }
  }
  handleClick() {
    if (!this.disabled) {
      if (this.state === M.WAITING_FOR_CLICK) {
        this.endPressAnimation();
        return;
      }
      this.state === M.INACTIVE && (this.startPressAnimation(), this.endPressAnimation());
    }
  }
  handlePointercancel(e) {
    this.shouldReactToEvent(e) && this.endPressAnimation();
  }
  handleContextmenu() {
    this.disabled || (this.checkBoundsAfterContextMenu = !0, this.endPressAnimation());
  }
  determineRippleSize() {
    const { height: e, width: t } = this.getBoundingClientRect(), i = Math.max(e, t), r = Math.max(Ro * i, Io), n = Math.floor(i * Ao), l = Math.sqrt(t ** 2 + e ** 2) + ko;
    this.initialSize = n, this.rippleScale = `${(l + r) / n}`, this.rippleSize = `${n}px`;
  }
  getNormalizedPointerEventCoords(e) {
    const { scrollX: t, scrollY: i } = window, { left: r, top: n } = this.getBoundingClientRect(), s = t + r, l = i + n, { pageX: d, pageY: m } = e;
    return { x: d - s, y: m - l };
  }
  getTranslationCoordinates(e) {
    const { height: t, width: i } = this.getBoundingClientRect(), r = {
      x: (i - this.initialSize) / 2,
      y: (t - this.initialSize) / 2
    };
    let n;
    return e instanceof PointerEvent ? n = this.getNormalizedPointerEventCoords(e) : n = {
      x: i / 2,
      y: t / 2
    }, n = {
      x: n.x - this.initialSize / 2,
      y: n.y - this.initialSize / 2
    }, { startPoint: n, endPoint: r };
  }
  startPressAnimation(e) {
    var s;
    if (!this.mdRoot)
      return;
    this.pressed = !0, (s = this.growAnimation) == null || s.cancel(), this.determineRippleSize();
    const { startPoint: t, endPoint: i } = this.getTranslationCoordinates(e), r = `${t.x}px, ${t.y}px`, n = `${i.x}px, ${i.y}px`;
    this.growAnimation = this.mdRoot.animate({
      top: [0, 0],
      left: [0, 0],
      height: [this.rippleSize, this.rippleSize],
      width: [this.rippleSize, this.rippleSize],
      transform: [
        `translate(${r}) scale(1)`,
        `translate(${n}) scale(${this.rippleScale})`
      ]
    }, {
      pseudoElement: Oo,
      duration: To,
      easing: _e.STANDARD,
      fill: zo
    });
  }
  async endPressAnimation() {
    this.rippleStartEvent = void 0, this.state = M.INACTIVE;
    const e = this.growAnimation;
    let t = 1 / 0;
    if (typeof (e == null ? void 0 : e.currentTime) == "number" ? t = e.currentTime : e != null && e.currentTime && (t = e.currentTime.to("ms").value), t >= Zt) {
      this.pressed = !1;
      return;
    }
    await new Promise((i) => {
      setTimeout(i, Zt - t);
    }), this.growAnimation === e && (this.pressed = !1);
  }
  /**
   * Returns `true` if
   *  - the ripple element is enabled
   *  - the pointer is primary for the input type
   *  - the pointer is the pointer that started the interaction, or will start
   * the interaction
   *  - the pointer is a touch, or the pointer state has the primary button
   * held, or the pointer is hovering
   */
  shouldReactToEvent(e) {
    if (this.disabled || !e.isPrimary || this.rippleStartEvent && this.rippleStartEvent.pointerId !== e.pointerId)
      return !1;
    if (e.type === "pointerenter" || e.type === "pointerleave")
      return !this.isTouch(e);
    const t = e.buttons === 1;
    return this.isTouch(e) || t;
  }
  /**
   * Check if the event is within the bounds of the element.
   *
   * This is only needed for the "stuck" contextmenu longpress on Chrome.
   */
  inBounds({ x: e, y: t }) {
    const { top: i, left: r, bottom: n, right: s } = this.getBoundingClientRect();
    return e >= r && e <= s && t >= i && t <= n;
  }
  isTouch({ pointerType: e }) {
    return e === "touch";
  }
  /** @private */
  async handleEvent(e) {
    if (!(at != null && at.matches))
      switch (e.type) {
        case "click":
          this.handleClick();
          break;
        case "contextmenu":
          this.handleContextmenu();
          break;
        case "pointercancel":
          this.handlePointercancel(e);
          break;
        case "pointerdown":
          await this.handlePointerdown(e);
          break;
        case "pointerenter":
          this.handlePointerenter(e);
          break;
        case "pointerleave":
          this.handlePointerleave(e);
          break;
        case "pointerup":
          this.handlePointerup(e);
          break;
      }
  }
  onControlChange(e, t) {
    for (const i of Po)
      e == null || e.removeEventListener(i, this), t == null || t.addEventListener(i, this);
  }
}
a([
  c({ type: Boolean, reflect: !0 })
], Me.prototype, "disabled", void 0);
a([
  z()
], Me.prototype, "hovered", void 0);
a([
  z()
], Me.prototype, "pressed", void 0);
a([
  F(".surface")
], Me.prototype, "mdRoot", void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Mo = B`:host{display:flex;margin:auto;pointer-events:none}:host([disabled]){display:none}@media(forced-colors: active){:host{display:none}}:host,.surface{border-radius:inherit;position:absolute;inset:0;overflow:hidden}.surface{-webkit-tap-highlight-color:rgba(0,0,0,0)}.surface::before,.surface::after{content:"";opacity:0;position:absolute}.surface::before{background-color:var(--md-ripple-hover-color, var(--md-sys-color-on-surface, #1d1b20));inset:0;transition:opacity 15ms linear,background-color 15ms linear}.surface::after{background:radial-gradient(closest-side, var(--md-ripple-pressed-color, var(--md-sys-color-on-surface, #1d1b20)) max(100% - 70px, 65%), transparent 100%);transform-origin:center center;transition:opacity 375ms linear}.hovered::before{background-color:var(--md-ripple-hover-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-ripple-hover-opacity, 0.08)}.pressed::after{opacity:var(--md-ripple-pressed-opacity, 0.12);transition-duration:105ms}
`;
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let pt = class extends Me {
};
pt.styles = [Mo];
pt = a([
  te("md-ripple")
], pt);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Do(o) {
  const e = new MouseEvent("click", { bubbles: !0 });
  return o.dispatchEvent(e), e;
}
function No(o) {
  return o.currentTarget !== o.target || o.composedPath()[0] !== o.target || o.target.disabled ? !1 : !Uo(o);
}
function Uo(o) {
  const e = ht;
  return e && (o.preventDefault(), o.stopImmediatePropagation()), Bo(), e;
}
let ht = !1;
async function Bo() {
  ht = !0, await null, ht = !1;
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Fo extends Pt {
  computeValidity(e) {
    return this.checkboxControl || (this.checkboxControl = document.createElement("input"), this.checkboxControl.type = "checkbox"), this.checkboxControl.checked = e.checked, this.checkboxControl.required = e.required, {
      validity: this.checkboxControl.validity,
      validationMessage: this.checkboxControl.validationMessage
    };
  }
  equals(e, t) {
    return e.checked === t.checked && e.required === t.required;
  }
  copy({ checked: e, required: t }) {
    return { checked: e, required: t };
  }
}
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const qo = Ot(zt(Rt(I)));
class Z extends qo {
  constructor() {
    super(), this.checked = !1, this.indeterminate = !1, this.required = !1, this.value = "on", this.prevChecked = !1, this.prevDisabled = !1, this.prevIndeterminate = !1, this.addEventListener("click", (e) => {
      !No(e) || !this.input || (this.focus(), Do(this.input));
    });
  }
  update(e) {
    (e.has("checked") || e.has("disabled") || e.has("indeterminate")) && (this.prevChecked = e.get("checked") ?? this.checked, this.prevDisabled = e.get("disabled") ?? this.disabled, this.prevIndeterminate = e.get("indeterminate") ?? this.indeterminate), super.update(e);
  }
  render() {
    const e = !this.prevChecked && !this.prevIndeterminate, t = this.prevChecked && !this.prevIndeterminate, i = this.prevIndeterminate, r = this.checked && !this.indeterminate, n = this.indeterminate, s = ne({
      disabled: this.disabled,
      selected: r || n,
      unselected: !r && !n,
      checked: r,
      indeterminate: n,
      "prev-unselected": e,
      "prev-checked": t,
      "prev-indeterminate": i,
      "prev-disabled": this.prevDisabled
    }), { ariaLabel: l, ariaInvalid: d } = this;
    return p`
      <div class="container ${s}">
        <input
          type="checkbox"
          id="input"
          aria-checked=${n ? "mixed" : b}
          aria-label=${l || b}
          aria-invalid=${d || b}
          ?disabled=${this.disabled}
          ?required=${this.required}
          .indeterminate=${this.indeterminate}
          .checked=${this.checked}
          @input=${this.handleInput}
          @change=${this.handleChange} />

        <div class="outline"></div>
        <div class="background"></div>
        <md-focus-ring part="focus-ring" for="input"></md-focus-ring>
        <md-ripple for="input" ?disabled=${this.disabled}></md-ripple>
        <svg class="icon" viewBox="0 0 18 18" aria-hidden="true">
          <rect class="mark short" />
          <rect class="mark long" />
        </svg>
      </div>
    `;
  }
  handleInput(e) {
    const t = e.target;
    this.checked = t.checked, this.indeterminate = t.indeterminate;
  }
  handleChange(e) {
    It(this, e);
  }
  [we]() {
    return !this.checked || this.indeterminate ? null : this.value;
  }
  [dt]() {
    return String(this.checked);
  }
  formResetCallback() {
    this.checked = this.hasAttribute("checked");
  }
  formStateRestoreCallback(e) {
    this.checked = e === "true";
  }
  [ze]() {
    return new Fo(() => this);
  }
  [Pe]() {
    return this.input;
  }
}
Ze(Z);
Z.shadowRootOptions = {
  ...I.shadowRootOptions,
  delegatesFocus: !0
};
a([
  c({ type: Boolean })
], Z.prototype, "checked", void 0);
a([
  c({ type: Boolean })
], Z.prototype, "indeterminate", void 0);
a([
  c({ type: Boolean })
], Z.prototype, "required", void 0);
a([
  c()
], Z.prototype, "value", void 0);
a([
  z()
], Z.prototype, "prevChecked", void 0);
a([
  z()
], Z.prototype, "prevDisabled", void 0);
a([
  z()
], Z.prototype, "prevIndeterminate", void 0);
a([
  F("input")
], Z.prototype, "input", void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Ho = B`:host{border-start-start-radius:var(--md-checkbox-container-shape-start-start, var(--md-checkbox-container-shape, 2px));border-start-end-radius:var(--md-checkbox-container-shape-start-end, var(--md-checkbox-container-shape, 2px));border-end-end-radius:var(--md-checkbox-container-shape-end-end, var(--md-checkbox-container-shape, 2px));border-end-start-radius:var(--md-checkbox-container-shape-end-start, var(--md-checkbox-container-shape, 2px));display:inline-flex;height:var(--md-checkbox-container-size, 18px);position:relative;vertical-align:top;width:var(--md-checkbox-container-size, 18px);-webkit-tap-highlight-color:rgba(0,0,0,0);cursor:pointer}:host([disabled]){cursor:default}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--md-checkbox-container-size, 18px))/2)}md-focus-ring{height:44px;inset:unset;width:44px}input{appearance:none;height:48px;margin:0;opacity:0;outline:none;position:absolute;width:48px;z-index:1;cursor:inherit}:host([touch-target=none]) input{height:100%;width:100%}.container{border-radius:inherit;display:flex;height:100%;place-content:center;place-items:center;position:relative;width:100%}.outline,.background,.icon{inset:0;position:absolute}.outline,.background{border-radius:inherit}.outline{border-color:var(--md-checkbox-outline-color, var(--md-sys-color-on-surface-variant, #49454f));border-style:solid;border-width:var(--md-checkbox-outline-width, 2px);box-sizing:border-box}.background{background-color:var(--md-checkbox-selected-container-color, var(--md-sys-color-primary, #6750a4))}.background,.icon{opacity:0;transition-duration:150ms,50ms;transition-property:transform,opacity;transition-timing-function:cubic-bezier(0.3, 0, 0.8, 0.15),linear;transform:scale(0.6)}:where(.selected) :is(.background,.icon){opacity:1;transition-duration:350ms,50ms;transition-timing-function:cubic-bezier(0.05, 0.7, 0.1, 1),linear;transform:scale(1)}md-ripple{border-radius:var(--md-checkbox-state-layer-shape, var(--md-sys-shape-corner-full, 9999px));height:var(--md-checkbox-state-layer-size, 40px);inset:unset;width:var(--md-checkbox-state-layer-size, 40px);--md-ripple-hover-color: var(--md-checkbox-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-hover-opacity: var(--md-checkbox-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-checkbox-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--md-ripple-pressed-opacity: var(--md-checkbox-pressed-state-layer-opacity, 0.12)}.selected md-ripple{--md-ripple-hover-color: var(--md-checkbox-selected-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--md-ripple-hover-opacity: var(--md-checkbox-selected-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-checkbox-selected-pressed-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-pressed-opacity: var(--md-checkbox-selected-pressed-state-layer-opacity, 0.12)}.icon{fill:var(--md-checkbox-selected-icon-color, var(--md-sys-color-on-primary, #fff));height:var(--md-checkbox-icon-size, 18px);width:var(--md-checkbox-icon-size, 18px)}.mark.short{height:2px;transition-property:transform,height;width:2px}.mark.long{height:2px;transition-property:transform,width;width:10px}.mark{animation-duration:150ms;animation-timing-function:cubic-bezier(0.3, 0, 0.8, 0.15);transition-duration:150ms;transition-timing-function:cubic-bezier(0.3, 0, 0.8, 0.15)}.selected .mark{animation-duration:350ms;animation-timing-function:cubic-bezier(0.05, 0.7, 0.1, 1);transition-duration:350ms;transition-timing-function:cubic-bezier(0.05, 0.7, 0.1, 1)}.checked .mark,.prev-checked.unselected .mark{transform:scaleY(-1) translate(7px, -14px) rotate(45deg)}.checked .mark.short,.prev-checked.unselected .mark.short{height:5.6568542495px}.checked .mark.long,.prev-checked.unselected .mark.long{width:11.313708499px}.indeterminate .mark,.prev-indeterminate.unselected .mark{transform:scaleY(-1) translate(4px, -10px) rotate(0deg)}.prev-unselected .mark{transition-property:none}.prev-unselected.checked .mark.long{animation-name:prev-unselected-to-checked}@keyframes prev-unselected-to-checked{from{width:0}}:where(:hover) .outline{border-color:var(--md-checkbox-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));border-width:var(--md-checkbox-hover-outline-width, 2px)}:where(:hover) .background{background:var(--md-checkbox-selected-hover-container-color, var(--md-sys-color-primary, #6750a4))}:where(:hover) .icon{fill:var(--md-checkbox-selected-hover-icon-color, var(--md-sys-color-on-primary, #fff))}:where(:focus-within) .outline{border-color:var(--md-checkbox-focus-outline-color, var(--md-sys-color-on-surface, #1d1b20));border-width:var(--md-checkbox-focus-outline-width, 2px)}:where(:focus-within) .background{background:var(--md-checkbox-selected-focus-container-color, var(--md-sys-color-primary, #6750a4))}:where(:focus-within) .icon{fill:var(--md-checkbox-selected-focus-icon-color, var(--md-sys-color-on-primary, #fff))}:where(:active) .outline{border-color:var(--md-checkbox-pressed-outline-color, var(--md-sys-color-on-surface, #1d1b20));border-width:var(--md-checkbox-pressed-outline-width, 2px)}:where(:active) .background{background:var(--md-checkbox-selected-pressed-container-color, var(--md-sys-color-primary, #6750a4))}:where(:active) .icon{fill:var(--md-checkbox-selected-pressed-icon-color, var(--md-sys-color-on-primary, #fff))}:where(.disabled,.prev-disabled) :is(.background,.icon,.mark){animation-duration:0s;transition-duration:0s}:where(.disabled) .outline{border-color:var(--md-checkbox-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));border-width:var(--md-checkbox-disabled-outline-width, 2px);opacity:var(--md-checkbox-disabled-container-opacity, 0.38)}:where(.selected.disabled) .outline{visibility:hidden}:where(.selected.disabled) .background{background:var(--md-checkbox-selected-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-checkbox-selected-disabled-container-opacity, 0.38)}:where(.disabled) .icon{fill:var(--md-checkbox-selected-disabled-icon-color, var(--md-sys-color-surface, #fef7ff))}@media(forced-colors: active){.background{background-color:CanvasText}.selected.disabled .background{background-color:GrayText;opacity:1}.outline{border-color:CanvasText}.disabled .outline{border-color:GrayText;opacity:1}.icon{fill:Canvas}}
`;
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let mt = class extends Z {
};
mt.styles = [Ho];
mt = a([
  te("md-checkbox")
], mt);
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Vo extends I {
  connectedCallback() {
    super.connectedCallback(), this.setAttribute("aria-hidden", "true");
  }
  render() {
    return p`<span class="shadow"></span>`;
  }
}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const jo = B`:host,.shadow,.shadow::before,.shadow::after{border-radius:inherit;inset:0;position:absolute;transition-duration:inherit;transition-property:inherit;transition-timing-function:inherit}:host{display:flex;pointer-events:none;transition-property:box-shadow,opacity}.shadow::before,.shadow::after{content:"";transition-property:box-shadow,opacity;--_level: var(--md-elevation-level, 0);--_shadow-color: var(--md-elevation-shadow-color, var(--md-sys-color-shadow, #000))}.shadow::before{box-shadow:0px calc(1px*(clamp(0,var(--_level),1) + clamp(0,var(--_level) - 3,1) + 2*clamp(0,var(--_level) - 4,1))) calc(1px*(2*clamp(0,var(--_level),1) + clamp(0,var(--_level) - 2,1) + clamp(0,var(--_level) - 4,1))) 0px var(--_shadow-color);opacity:.3}.shadow::after{box-shadow:0px calc(1px*(clamp(0,var(--_level),1) + clamp(0,var(--_level) - 1,1) + 2*clamp(0,var(--_level) - 2,3))) calc(1px*(3*clamp(0,var(--_level),2) + 2*clamp(0,var(--_level) - 2,3))) calc(1px*(clamp(0,var(--_level),4) + 2*clamp(0,var(--_level) - 4,1))) var(--_shadow-color);opacity:.15}
`;
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let ft = class extends Vo {
};
ft.styles = [jo];
ft = a([
  te("md-elevation")
], ft);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function $i(o, e = se) {
  const t = Mt(o, e);
  return t && (t.tabIndex = 0, t.focus()), t;
}
function Ei(o, e = se) {
  const t = Si(o, e);
  return t && (t.tabIndex = 0, t.focus()), t;
}
function ke(o, e = se) {
  for (let t = 0; t < o.length; t++) {
    const i = o[t];
    if (i.tabIndex === 0 && e(i))
      return {
        item: i,
        index: t
      };
  }
  return null;
}
function Mt(o, e = se) {
  for (const t of o)
    if (e(t))
      return t;
  return null;
}
function Si(o, e = se) {
  for (let t = o.length - 1; t >= 0; t--) {
    const i = o[t];
    if (e(i))
      return i;
  }
  return null;
}
function Go(o, e, t = se, i = !0) {
  for (let r = 1; r < o.length; r++) {
    const n = (r + e) % o.length;
    if (n < e && !i)
      return null;
    const s = o[n];
    if (t(s))
      return s;
  }
  return o[e] ? o[e] : null;
}
function Wo(o, e, t = se, i = !0) {
  for (let r = 1; r < o.length; r++) {
    const n = (e - r + o.length) % o.length;
    if (n > e && !i)
      return null;
    const s = o[n];
    if (t(s))
      return s;
  }
  return o[e] ? o[e] : null;
}
function ei(o, e, t = se, i = !0) {
  if (e) {
    const r = Go(o, e.index, t, i);
    return r && (r.tabIndex = 0, r.focus()), r;
  } else
    return $i(o, t);
}
function ti(o, e, t = se, i = !0) {
  if (e) {
    const r = Wo(o, e.index, t, i);
    return r && (r.tabIndex = 0, r.focus()), r;
  } else
    return Ei(o, t);
}
function se(o) {
  return !o.disabled;
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const L = {
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowUp: "ArrowUp",
  ArrowRight: "ArrowRight",
  Home: "Home",
  End: "End"
};
class Ko {
  constructor(e) {
    this.handleKeydown = (g) => {
      const u = g.key;
      if (g.defaultPrevented || !this.isNavigableKey(u))
        return;
      const v = this.items;
      if (!v.length)
        return;
      const y = ke(v, this.isActivatable);
      g.preventDefault();
      const T = this.isRtl(), A = T ? L.ArrowRight : L.ArrowLeft, _ = T ? L.ArrowLeft : L.ArrowRight;
      let x = null;
      switch (u) {
        // Activate the next item
        case L.ArrowDown:
        case _:
          x = ei(v, y, this.isActivatable, this.wrapNavigation());
          break;
        // Activate the previous item
        case L.ArrowUp:
        case A:
          x = ti(v, y, this.isActivatable, this.wrapNavigation());
          break;
        // Activate the first item
        case L.Home:
          x = $i(v, this.isActivatable);
          break;
        // Activate the last item
        case L.End:
          x = Ei(v, this.isActivatable);
          break;
      }
      x && y && y.item !== x && (y.item.tabIndex = -1);
    }, this.onDeactivateItems = () => {
      const g = this.items;
      for (const u of g)
        this.deactivateItem(u);
    }, this.onRequestActivation = (g) => {
      this.onDeactivateItems();
      const u = g.target;
      this.activateItem(u), u.focus();
    }, this.onSlotchange = () => {
      const g = this.items;
      let u = !1;
      for (const y of g) {
        if (!y.disabled && y.tabIndex > -1 && !u) {
          u = !0, y.tabIndex = 0;
          continue;
        }
        y.tabIndex = -1;
      }
      if (u)
        return;
      const v = Mt(g, this.isActivatable);
      v && (v.tabIndex = 0);
    };
    const { isItem: t, getPossibleItems: i, isRtl: r, deactivateItem: n, activateItem: s, isNavigableKey: l, isActivatable: d, wrapNavigation: m } = e;
    this.isItem = t, this.getPossibleItems = i, this.isRtl = r, this.deactivateItem = n, this.activateItem = s, this.isNavigableKey = l, this.isActivatable = d, this.wrapNavigation = m ?? (() => !0);
  }
  /**
   * The items being managed by the list. Additionally, attempts to see if the
   * object has a sub-item in the `.item` property.
   */
  get items() {
    const e = this.getPossibleItems(), t = [];
    for (const i of e) {
      if (this.isItem(i)) {
        t.push(i);
        continue;
      }
      const n = i.item;
      n && this.isItem(n) && t.push(n);
    }
    return t;
  }
  /**
   * Activates the next item in the list. If at the end of the list, the first
   * item will be activated.
   *
   * @return The activated list item or `null` if there are no items.
   */
  activateNextItem() {
    const e = this.items, t = ke(e, this.isActivatable);
    return t && (t.item.tabIndex = -1), ei(e, t, this.isActivatable, this.wrapNavigation());
  }
  /**
   * Activates the previous item in the list. If at the start of the list, the
   * last item will be activated.
   *
   * @return The activated list item or `null` if there are no items.
   */
  activatePreviousItem() {
    const e = this.items, t = ke(e, this.isActivatable);
    return t && (t.item.tabIndex = -1), ti(e, t, this.isActivatable, this.wrapNavigation());
  }
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Yo(o, e) {
  return new CustomEvent("close-menu", {
    bubbles: !0,
    composed: !0,
    detail: { initiator: o, reason: e, itemPath: [o] }
  });
}
const ii = Yo, vt = {
  SPACE: "Space",
  ENTER: "Enter"
}, oi = {
  CLICK_SELECTION: "click-selection",
  KEYDOWN: "keydown"
}, Xo = {
  ESCAPE: "Escape",
  SPACE: vt.SPACE,
  ENTER: vt.ENTER
};
function Ti(o) {
  return Object.values(Xo).some((e) => e === o);
}
function Qo(o) {
  return Object.values(vt).some((e) => e === o);
}
function gt(o, e) {
  const t = new Event("md-contains", { bubbles: !0, composed: !0 });
  let i = [];
  const r = (s) => {
    i = s.composedPath();
  };
  return e.addEventListener("md-contains", r), o.dispatchEvent(t), e.removeEventListener("md-contains", r), i.length > 0;
}
const J = {
  NONE: "none",
  LIST_ROOT: "list-root",
  FIRST_ITEM: "first-item",
  LAST_ITEM: "last-item"
};
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ri = {
  END_START: "end-start",
  START_START: "start-start"
};
class Jo {
  /**
   * @param host The host to connect the controller to.
   * @param getProperties A function that returns the properties for the
   * controller.
   */
  constructor(e, t) {
    this.host = e, this.getProperties = t, this.surfaceStylesInternal = {
      display: "none"
    }, this.lastValues = {
      isOpen: !1
    }, this.host.addController(this);
  }
  /**
   * The StyleInfo map to apply to the surface via Lit's stylemap
   */
  get surfaceStyles() {
    return this.surfaceStylesInternal;
  }
  /**
   * Calculates the surface's new position required so that the surface's
   * `surfaceCorner` aligns to the anchor's `anchorCorner` while keeping the
   * surface inside the window viewport. This positioning also respects RTL by
   * checking `getComputedStyle()` on the surface element.
   */
  async position() {
    const { surfaceEl: e, anchorEl: t, anchorCorner: i, surfaceCorner: r, positioning: n, xOffset: s, yOffset: l, repositionStrategy: d } = this.getProperties(), m = i.toLowerCase().trim(), g = r.toLowerCase().trim();
    if (!e || !t)
      return;
    const u = window.innerWidth, v = window.innerHeight, y = document.createElement("div");
    y.style.opacity = "0", y.style.position = "fixed", y.style.display = "block", y.style.inset = "0", document.body.appendChild(y);
    const T = y.getBoundingClientRect();
    y.remove();
    const A = window.innerHeight - T.bottom, _ = window.innerWidth - T.right;
    this.surfaceStylesInternal = {
      display: "block",
      opacity: "0"
    }, this.host.requestUpdate(), await this.host.updateComplete, e.popover && e.isConnected && e.showPopover();
    const x = e.getSurfacePositionClientRect ? e.getSurfacePositionClientRect() : e.getBoundingClientRect(), $ = t.getSurfacePositionClientRect ? t.getSurfacePositionClientRect() : t.getBoundingClientRect(), [D, P] = g.split("-"), [k, W] = m.split("-"), K = getComputedStyle(e).direction === "ltr";
    let { blockInset: H, blockOutOfBoundsCorrection: Y, surfaceBlockProperty: ce } = this.calculateBlock({
      surfaceRect: x,
      anchorRect: $,
      anchorBlock: k,
      surfaceBlock: D,
      yOffset: l,
      positioning: n,
      windowInnerHeight: v,
      blockScrollbarHeight: A
    });
    if (Y) {
      const ge = D === "start" ? "end" : "start", be = k === "start" ? "end" : "start", V = this.calculateBlock({
        surfaceRect: x,
        anchorRect: $,
        anchorBlock: be,
        surfaceBlock: ge,
        yOffset: l,
        positioning: n,
        windowInnerHeight: v,
        blockScrollbarHeight: A
      });
      Y > V.blockOutOfBoundsCorrection && (H = V.blockInset, Y = V.blockOutOfBoundsCorrection, ce = V.surfaceBlockProperty);
    }
    let { inlineInset: X, inlineOutOfBoundsCorrection: ie, surfaceInlineProperty: $e } = this.calculateInline({
      surfaceRect: x,
      anchorRect: $,
      anchorInline: W,
      surfaceInline: P,
      xOffset: s,
      positioning: n,
      isLTR: K,
      windowInnerWidth: u,
      inlineScrollbarWidth: _
    });
    if (ie) {
      const ge = P === "start" ? "end" : "start", be = W === "start" ? "end" : "start", V = this.calculateInline({
        surfaceRect: x,
        anchorRect: $,
        anchorInline: be,
        surfaceInline: ge,
        xOffset: s,
        positioning: n,
        isLTR: K,
        windowInnerWidth: u,
        inlineScrollbarWidth: _
      });
      Math.abs(ie) > Math.abs(V.inlineOutOfBoundsCorrection) && (X = V.inlineInset, ie = V.inlineOutOfBoundsCorrection, $e = V.surfaceInlineProperty);
    }
    d === "move" && (H = H - Y, X = X - ie), this.surfaceStylesInternal = {
      display: "block",
      opacity: "1",
      [ce]: `${H}px`,
      [$e]: `${X}px`
    }, d === "resize" && (Y && (this.surfaceStylesInternal.height = `${x.height - Y}px`), ie && (this.surfaceStylesInternal.width = `${x.width - ie}px`)), this.host.requestUpdate();
  }
  /**
   * Calculates the css property, the inset, and the out of bounds correction
   * for the surface in the block direction.
   */
  calculateBlock(e) {
    const { surfaceRect: t, anchorRect: i, anchorBlock: r, surfaceBlock: n, yOffset: s, positioning: l, windowInnerHeight: d, blockScrollbarHeight: m } = e, g = l === "fixed" || l === "document" ? 1 : 0, u = l === "document" ? 1 : 0, v = n === "start" ? 1 : 0, y = n === "end" ? 1 : 0, A = (r !== n ? 1 : 0) * i.height + s, _ = v * i.top + y * (d - i.bottom - m), x = v * window.scrollY - y * window.scrollY, $ = Math.abs(Math.min(0, d - _ - A - t.height));
    return { blockInset: g * _ + u * x + A, blockOutOfBoundsCorrection: $, surfaceBlockProperty: n === "start" ? "inset-block-start" : "inset-block-end" };
  }
  /**
   * Calculates the css property, the inset, and the out of bounds correction
   * for the surface in the inline direction.
   */
  calculateInline(e) {
    const { isLTR: t, surfaceInline: i, anchorInline: r, anchorRect: n, surfaceRect: s, xOffset: l, positioning: d, windowInnerWidth: m, inlineScrollbarWidth: g } = e, u = d === "fixed" || d === "document" ? 1 : 0, v = d === "document" ? 1 : 0, y = t ? 1 : 0, T = t ? 0 : 1, A = i === "start" ? 1 : 0, _ = i === "end" ? 1 : 0, $ = (r !== i ? 1 : 0) * n.width + l, D = A * n.left + _ * (m - n.right - g), P = A * (m - n.right - g) + _ * n.left, k = y * D + T * P, W = A * window.scrollX - _ * window.scrollX, K = _ * window.scrollX - A * window.scrollX, H = y * W + T * K, Y = Math.abs(Math.min(0, m - k - $ - s.width)), ce = u * k + $ + v * H;
    let X = i === "start" ? "inset-inline-start" : "inset-inline-end";
    return (d === "document" || d === "fixed") && (i === "start" && t || i === "end" && !t ? X = "left" : X = "right"), {
      inlineInset: ce,
      inlineOutOfBoundsCorrection: Y,
      surfaceInlineProperty: X
    };
  }
  hostUpdate() {
    this.onUpdate();
  }
  hostUpdated() {
    this.onUpdate();
  }
  /**
   * Checks whether the properties passed into the controller have changed since
   * the last positioning. If so, it will reposition if the surface is open or
   * close it if the surface should close.
   */
  async onUpdate() {
    const e = this.getProperties();
    let t = !1;
    for (const [s, l] of Object.entries(e))
      if (t = t || l !== this.lastValues[s], t)
        break;
    const i = this.lastValues.isOpen !== e.isOpen, r = !!e.anchorEl, n = !!e.surfaceEl;
    t && r && n && (this.lastValues.isOpen = e.isOpen, e.isOpen ? (this.lastValues = e, await this.position(), e.onOpen()) : i && (await e.beforeClose(), this.close(), e.onClose()));
  }
  /**
   * Hides the surface.
   */
  close() {
    this.surfaceStylesInternal = {
      display: "none"
    }, this.host.requestUpdate();
    const e = this.getProperties().surfaceEl;
    e != null && e.popover && (e != null && e.isConnected) && e.hidePopover();
  }
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const j = {
  INDEX: 0,
  ITEM: 1,
  TEXT: 2
};
class Zo {
  /**
   * @param getProperties A function that returns the options of the typeahead
   * controller:
   *
   * {
   *   getItems: A function that returns an array of menu items to be searched.
   *   typeaheadBufferTime: The maximum time between each keystroke to keep the
   *       current type buffer alive.
   * }
   */
  constructor(e) {
    this.getProperties = e, this.typeaheadRecords = [], this.typaheadBuffer = "", this.cancelTypeaheadTimeout = 0, this.isTypingAhead = !1, this.lastActiveRecord = null, this.onKeydown = (t) => {
      this.isTypingAhead ? this.typeahead(t) : this.beginTypeahead(t);
    }, this.endTypeahead = () => {
      this.isTypingAhead = !1, this.typaheadBuffer = "", this.typeaheadRecords = [];
    };
  }
  get items() {
    return this.getProperties().getItems();
  }
  get active() {
    return this.getProperties().active;
  }
  /**
   * Sets up typingahead
   */
  beginTypeahead(e) {
    this.active && (e.code === "Space" || e.code === "Enter" || e.code.startsWith("Arrow") || e.code === "Escape" || (this.isTypingAhead = !0, this.typeaheadRecords = this.items.map((t, i) => [
      i,
      t,
      t.typeaheadText.trim().toLowerCase()
    ]), this.lastActiveRecord = this.typeaheadRecords.find((t) => t[j.ITEM].tabIndex === 0) ?? null, this.lastActiveRecord && (this.lastActiveRecord[j.ITEM].tabIndex = -1), this.typeahead(e)));
  }
  /**
   * Performs the typeahead. Based on the normalized items and the current text
   * buffer, finds the _next_ item with matching text and activates it.
   *
   * @example
   *
   * items: Apple, Banana, Olive, Orange, Cucumber
   * buffer: ''
   * user types: o
   *
   * activates Olive
   *
   * @example
   *
   * items: Apple, Banana, Olive (active), Orange, Cucumber
   * buffer: 'o'
   * user types: l
   *
   * activates Olive
   *
   * @example
   *
   * items: Apple, Banana, Olive (active), Orange, Cucumber
   * buffer: ''
   * user types: o
   *
   * activates Orange
   *
   * @example
   *
   * items: Apple, Banana, Olive, Orange (active), Cucumber
   * buffer: ''
   * user types: o
   *
   * activates Olive
   */
  typeahead(e) {
    if (e.defaultPrevented)
      return;
    if (clearTimeout(this.cancelTypeaheadTimeout), e.code === "Enter" || e.code.startsWith("Arrow") || e.code === "Escape") {
      this.endTypeahead(), this.lastActiveRecord && (this.lastActiveRecord[j.ITEM].tabIndex = -1);
      return;
    }
    e.code === "Space" && e.preventDefault(), this.cancelTypeaheadTimeout = setTimeout(this.endTypeahead, this.getProperties().typeaheadBufferTime), this.typaheadBuffer += e.key.toLowerCase();
    const t = this.lastActiveRecord ? this.lastActiveRecord[j.INDEX] : -1, i = this.typeaheadRecords.length, r = (d) => (d[j.INDEX] + i - t) % i, n = this.typeaheadRecords.filter((d) => !d[j.ITEM].disabled && d[j.TEXT].startsWith(this.typaheadBuffer)).sort((d, m) => r(d) - r(m));
    if (n.length === 0) {
      clearTimeout(this.cancelTypeaheadTimeout), this.lastActiveRecord && (this.lastActiveRecord[j.ITEM].tabIndex = -1), this.endTypeahead();
      return;
    }
    const s = this.typaheadBuffer.length === 1;
    let l;
    this.lastActiveRecord === n[0] && s ? l = n[1] ?? n[0] : l = n[0], this.lastActiveRecord && (this.lastActiveRecord[j.ITEM].tabIndex = -1), this.lastActiveRecord = l, l[j.ITEM].tabIndex = 0, l[j.ITEM].focus();
  }
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Ai = 200, ki = /* @__PURE__ */ new Set([
  L.ArrowDown,
  L.ArrowUp,
  L.Home,
  L.End
]), er = /* @__PURE__ */ new Set([
  L.ArrowLeft,
  L.ArrowRight,
  ...ki
]);
function tr(o = document) {
  var t;
  let e = o.activeElement;
  for (; e && ((t = e == null ? void 0 : e.shadowRoot) != null && t.activeElement); )
    e = e.shadowRoot.activeElement;
  return e;
}
class O extends I {
  /**
   * Whether the menu is animating upwards or downwards when opening. This is
   * helpful for calculating some animation calculations.
   */
  get openDirection() {
    return this.menuCorner.split("-")[0] === "start" ? "DOWN" : "UP";
  }
  /**
   * The element which the menu should align to. If `anchor` is set to a
   * non-empty idref string, then `anchorEl` will resolve to the element with
   * the given id in the same root node. Otherwise, `null`.
   */
  get anchorElement() {
    return this.anchor ? this.getRootNode().querySelector(`#${this.anchor}`) : this.currentAnchorElement;
  }
  set anchorElement(e) {
    this.currentAnchorElement = e, this.requestUpdate("anchorElement");
  }
  constructor() {
    super(), this.anchor = "", this.positioning = "absolute", this.quick = !1, this.hasOverflow = !1, this.open = !1, this.xOffset = 0, this.yOffset = 0, this.typeaheadDelay = Ai, this.anchorCorner = ri.END_START, this.menuCorner = ri.START_START, this.stayOpenOnOutsideClick = !1, this.stayOpenOnFocusout = !1, this.skipRestoreFocus = !1, this.defaultFocus = J.FIRST_ITEM, this.noNavigationWrap = !1, this.typeaheadActive = !0, this.isSubmenu = !1, this.pointerPath = [], this.isRepositioning = !1, this.openCloseAnimationSignal = no(), this.listController = new Ko({
      isItem: (e) => e.hasAttribute("md-menu-item"),
      getPossibleItems: () => this.slotItems,
      isRtl: () => getComputedStyle(this).direction === "rtl",
      deactivateItem: (e) => {
        e.selected = !1, e.tabIndex = -1;
      },
      activateItem: (e) => {
        e.selected = !0, e.tabIndex = 0;
      },
      isNavigableKey: (e) => {
        if (!this.isSubmenu)
          return er.has(e);
        const i = getComputedStyle(this).direction === "rtl" ? L.ArrowLeft : L.ArrowRight;
        return e === i ? !0 : ki.has(e);
      },
      wrapNavigation: () => !this.noNavigationWrap
    }), this.lastFocusedElement = null, this.typeaheadController = new Zo(() => ({
      getItems: () => this.items,
      typeaheadBufferTime: this.typeaheadDelay,
      active: this.typeaheadActive
    })), this.currentAnchorElement = null, this.internals = // Cast needed for closure
    this.attachInternals(), this.menuPositionController = new Jo(this, () => ({
      anchorCorner: this.anchorCorner,
      surfaceCorner: this.menuCorner,
      surfaceEl: this.surfaceEl,
      anchorEl: this.anchorElement,
      positioning: this.positioning === "popover" ? "document" : this.positioning,
      isOpen: this.open,
      xOffset: this.xOffset,
      yOffset: this.yOffset,
      onOpen: this.onOpened,
      beforeClose: this.beforeClose,
      onClose: this.onClosed,
      // We can't resize components that have overflow like menus with
      // submenus because the overflow-y will show menu items / content
      // outside the bounds of the menu. Popover API fixes this because each
      // submenu is hoisted to the top-layer and are not considered overflow
      // content.
      repositionStrategy: this.hasOverflow && this.positioning !== "popover" ? "move" : "resize"
    })), this.onWindowResize = () => {
      this.isRepositioning || this.positioning !== "document" && this.positioning !== "fixed" && this.positioning !== "popover" || (this.isRepositioning = !0, this.reposition(), this.isRepositioning = !1);
    }, this.handleFocusout = async (e) => {
      const t = this.anchorElement;
      if (this.stayOpenOnFocusout || !this.open || this.pointerPath.includes(t))
        return;
      if (e.relatedTarget) {
        if (gt(e.relatedTarget, this) || this.pointerPath.length !== 0 && gt(e.relatedTarget, t))
          return;
      } else if (this.pointerPath.includes(this))
        return;
      const i = this.skipRestoreFocus;
      this.skipRestoreFocus = !0, this.close(), await this.updateComplete, this.skipRestoreFocus = i;
    }, this.onOpened = async () => {
      this.lastFocusedElement = tr();
      const e = this.items, t = ke(e);
      t && this.defaultFocus !== J.NONE && (t.item.tabIndex = -1);
      let i = !this.quick;
      switch (this.quick ? this.dispatchEvent(new Event("opening")) : i = !!await this.animateOpen(), this.defaultFocus) {
        case J.FIRST_ITEM:
          const r = Mt(e);
          r && (r.tabIndex = 0, r.focus(), await r.updateComplete);
          break;
        case J.LAST_ITEM:
          const n = Si(e);
          n && (n.tabIndex = 0, n.focus(), await n.updateComplete);
          break;
        case J.LIST_ROOT:
          this.focus();
          break;
        default:
        case J.NONE:
          break;
      }
      i || this.dispatchEvent(new Event("opened"));
    }, this.beforeClose = async () => {
      var e, t;
      this.open = !1, this.skipRestoreFocus || (t = (e = this.lastFocusedElement) == null ? void 0 : e.focus) == null || t.call(e), this.quick || await this.animateClose();
    }, this.onClosed = () => {
      this.quick && (this.dispatchEvent(new Event("closing")), this.dispatchEvent(new Event("closed")));
    }, this.onWindowPointerdown = (e) => {
      this.pointerPath = e.composedPath();
    }, this.onDocumentClick = (e) => {
      if (!this.open)
        return;
      const t = e.composedPath();
      !this.stayOpenOnOutsideClick && !t.includes(this) && !t.includes(this.anchorElement) && (this.open = !1);
    }, this.internals.role = "menu", this.addEventListener("keydown", this.handleKeydown), this.addEventListener("keydown", this.captureKeydown, { capture: !0 }), this.addEventListener("focusout", this.handleFocusout);
  }
  /**
   * The menu items associated with this menu. The items must be `MenuItem`s and
   * have both the `md-menu-item` and `md-list-item` attributes.
   */
  get items() {
    return this.listController.items;
  }
  willUpdate(e) {
    if (e.has("open")) {
      if (this.open) {
        this.removeAttribute("aria-hidden");
        return;
      }
      this.setAttribute("aria-hidden", "true");
    }
  }
  update(e) {
    e.has("open") && (this.open ? this.setUpGlobalEventListeners() : this.cleanUpGlobalEventListeners()), e.has("positioning") && this.positioning === "popover" && // type required for Google JS conformance
    !this.showPopover && (this.positioning = "fixed"), super.update(e);
  }
  connectedCallback() {
    super.connectedCallback(), this.open && this.setUpGlobalEventListeners();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.cleanUpGlobalEventListeners();
  }
  getBoundingClientRect() {
    return this.surfaceEl ? this.surfaceEl.getBoundingClientRect() : super.getBoundingClientRect();
  }
  getClientRects() {
    return this.surfaceEl ? this.surfaceEl.getClientRects() : super.getClientRects();
  }
  render() {
    return this.renderSurface();
  }
  /**
   * Renders the positionable surface element and its contents.
   */
  renderSurface() {
    return p`
      <div
        class="menu ${ne(this.getSurfaceClasses())}"
        style=${Ye(this.menuPositionController.surfaceStyles)}
        popover=${this.positioning === "popover" ? "manual" : b}>
        ${this.renderElevation()}
        <div class="items">
          <div class="item-padding"> ${this.renderMenuItems()} </div>
        </div>
      </div>
    `;
  }
  /**
   * Renders the menu items' slot
   */
  renderMenuItems() {
    return p`<slot
      @close-menu=${this.onCloseMenu}
      @deactivate-items=${this.onDeactivateItems}
      @request-activation=${this.onRequestActivation}
      @deactivate-typeahead=${this.handleDeactivateTypeahead}
      @activate-typeahead=${this.handleActivateTypeahead}
      @stay-open-on-focusout=${this.handleStayOpenOnFocusout}
      @close-on-focusout=${this.handleCloseOnFocusout}
      @slotchange=${this.listController.onSlotchange}></slot>`;
  }
  /**
   * Renders the elevation component.
   */
  renderElevation() {
    return p`<md-elevation part="elevation"></md-elevation>`;
  }
  getSurfaceClasses() {
    return {
      open: this.open,
      fixed: this.positioning === "fixed",
      "has-overflow": this.hasOverflow
    };
  }
  captureKeydown(e) {
    e.target === this && !e.defaultPrevented && Ti(e.code) && (e.preventDefault(), this.close()), this.typeaheadController.onKeydown(e);
  }
  /**
   * Performs the opening animation:
   *
   * https://direct.googleplex.com/#/spec/295000003+271060003
   *
   * @return A promise that resolve to `true` if the animation was aborted,
   *     `false` if it was not aborted.
   */
  async animateOpen() {
    const e = this.surfaceEl, t = this.slotEl;
    if (!e || !t)
      return !0;
    const i = this.openDirection;
    this.dispatchEvent(new Event("opening")), e.classList.toggle("animating", !0);
    const r = this.openCloseAnimationSignal.start(), n = e.offsetHeight, s = i === "UP", l = this.items, d = 500, m = 50, g = 250, u = (d - g) / l.length, v = e.animate([{ height: "0px" }, { height: `${n}px` }], {
      duration: d,
      easing: _e.EMPHASIZED
    }), y = t.animate([
      { transform: s ? `translateY(-${n}px)` : "" },
      { transform: "" }
    ], { duration: d, easing: _e.EMPHASIZED }), T = e.animate([{ opacity: 0 }, { opacity: 1 }], m), A = [];
    for (let $ = 0; $ < l.length; $++) {
      const D = s ? l.length - 1 - $ : $, P = l[D], k = P.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: g,
        delay: u * $
      });
      P.classList.toggle("md-menu-hidden", !0), k.addEventListener("finish", () => {
        P.classList.toggle("md-menu-hidden", !1);
      }), A.push([P, k]);
    }
    let _ = ($) => {
    };
    const x = new Promise(($) => {
      _ = $;
    });
    return r.addEventListener("abort", () => {
      v.cancel(), y.cancel(), T.cancel(), A.forEach(([$, D]) => {
        $.classList.toggle("md-menu-hidden", !1), D.cancel();
      }), _(!0);
    }), v.addEventListener("finish", () => {
      e.classList.toggle("animating", !1), this.openCloseAnimationSignal.finish(), _(!1);
    }), await x;
  }
  /**
   * Performs the closing animation:
   *
   * https://direct.googleplex.com/#/spec/295000003+271060003
   */
  animateClose() {
    let e;
    const t = new Promise((k) => {
      e = k;
    }), i = this.surfaceEl, r = this.slotEl;
    if (!i || !r)
      return e(!1), t;
    const s = this.openDirection === "UP";
    this.dispatchEvent(new Event("closing")), i.classList.toggle("animating", !0);
    const l = this.openCloseAnimationSignal.start(), d = i.offsetHeight, m = this.items, g = 150, u = 50, v = g - u, y = 50, T = 50, A = 0.35, _ = (g - T - y) / m.length, x = i.animate([
      { height: `${d}px` },
      { height: `${d * A}px` }
    ], {
      duration: g,
      easing: _e.EMPHASIZED_ACCELERATE
    }), $ = r.animate([
      { transform: "" },
      {
        transform: s ? `translateY(-${d * (1 - A)}px)` : ""
      }
    ], { duration: g, easing: _e.EMPHASIZED_ACCELERATE }), D = i.animate([{ opacity: 1 }, { opacity: 0 }], { duration: u, delay: v }), P = [];
    for (let k = 0; k < m.length; k++) {
      const W = s ? k : m.length - 1 - k, K = m[W], H = K.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: y,
        delay: T + _ * k
      });
      H.addEventListener("finish", () => {
        K.classList.toggle("md-menu-hidden", !0);
      }), P.push([K, H]);
    }
    return l.addEventListener("abort", () => {
      x.cancel(), $.cancel(), D.cancel(), P.forEach(([k, W]) => {
        W.cancel(), k.classList.toggle("md-menu-hidden", !1);
      }), e(!1);
    }), x.addEventListener("finish", () => {
      i.classList.toggle("animating", !1), P.forEach(([k]) => {
        k.classList.toggle("md-menu-hidden", !1);
      }), this.openCloseAnimationSignal.finish(), this.dispatchEvent(new Event("closed")), e(!0);
    }), t;
  }
  handleKeydown(e) {
    this.pointerPath = [], this.listController.handleKeydown(e);
  }
  setUpGlobalEventListeners() {
    document.addEventListener("click", this.onDocumentClick, { capture: !0 }), window.addEventListener("pointerdown", this.onWindowPointerdown), document.addEventListener("resize", this.onWindowResize, { passive: !0 }), window.addEventListener("resize", this.onWindowResize, { passive: !0 });
  }
  cleanUpGlobalEventListeners() {
    document.removeEventListener("click", this.onDocumentClick, {
      capture: !0
    }), window.removeEventListener("pointerdown", this.onWindowPointerdown), document.removeEventListener("resize", this.onWindowResize), window.removeEventListener("resize", this.onWindowResize);
  }
  onCloseMenu() {
    this.close();
  }
  onDeactivateItems(e) {
    e.stopPropagation(), this.listController.onDeactivateItems();
  }
  onRequestActivation(e) {
    e.stopPropagation(), this.listController.onRequestActivation(e);
  }
  handleDeactivateTypeahead(e) {
    e.stopPropagation(), this.typeaheadActive = !1;
  }
  handleActivateTypeahead(e) {
    e.stopPropagation(), this.typeaheadActive = !0;
  }
  handleStayOpenOnFocusout(e) {
    e.stopPropagation(), this.stayOpenOnFocusout = !0;
  }
  handleCloseOnFocusout(e) {
    e.stopPropagation(), this.stayOpenOnFocusout = !1;
  }
  close() {
    this.open = !1, this.slotItems.forEach((t) => {
      var i;
      (i = t.close) == null || i.call(t);
    });
  }
  show() {
    this.open = !0;
  }
  /**
   * Activates the next item in the menu. If at the end of the menu, the first
   * item will be activated.
   *
   * @return The activated menu item or `null` if there are no items.
   */
  activateNextItem() {
    return this.listController.activateNextItem() ?? null;
  }
  /**
   * Activates the previous item in the menu. If at the start of the menu, the
   * last item will be activated.
   *
   * @return The activated menu item or `null` if there are no items.
   */
  activatePreviousItem() {
    return this.listController.activatePreviousItem() ?? null;
  }
  /**
   * Repositions the menu if it is open.
   *
   * Useful for the case where document or window-positioned menus have their
   * anchors moved while open.
   */
  reposition() {
    this.open && this.menuPositionController.position();
  }
}
a([
  F(".menu")
], O.prototype, "surfaceEl", void 0);
a([
  F("slot")
], O.prototype, "slotEl", void 0);
a([
  c()
], O.prototype, "anchor", void 0);
a([
  c()
], O.prototype, "positioning", void 0);
a([
  c({ type: Boolean })
], O.prototype, "quick", void 0);
a([
  c({ type: Boolean, attribute: "has-overflow" })
], O.prototype, "hasOverflow", void 0);
a([
  c({ type: Boolean, reflect: !0 })
], O.prototype, "open", void 0);
a([
  c({ type: Number, attribute: "x-offset" })
], O.prototype, "xOffset", void 0);
a([
  c({ type: Number, attribute: "y-offset" })
], O.prototype, "yOffset", void 0);
a([
  c({ type: Number, attribute: "typeahead-delay" })
], O.prototype, "typeaheadDelay", void 0);
a([
  c({ attribute: "anchor-corner" })
], O.prototype, "anchorCorner", void 0);
a([
  c({ attribute: "menu-corner" })
], O.prototype, "menuCorner", void 0);
a([
  c({ type: Boolean, attribute: "stay-open-on-outside-click" })
], O.prototype, "stayOpenOnOutsideClick", void 0);
a([
  c({ type: Boolean, attribute: "stay-open-on-focusout" })
], O.prototype, "stayOpenOnFocusout", void 0);
a([
  c({ type: Boolean, attribute: "skip-restore-focus" })
], O.prototype, "skipRestoreFocus", void 0);
a([
  c({ attribute: "default-focus" })
], O.prototype, "defaultFocus", void 0);
a([
  c({ type: Boolean, attribute: "no-navigation-wrap" })
], O.prototype, "noNavigationWrap", void 0);
a([
  ve({ flatten: !0 })
], O.prototype, "slotItems", void 0);
a([
  z()
], O.prototype, "typeaheadActive", void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ir = B`:host{--md-elevation-level: var(--md-menu-container-elevation, 2);--md-elevation-shadow-color: var(--md-menu-container-shadow-color, var(--md-sys-color-shadow, #000));min-width:112px;color:unset;display:contents}md-focus-ring{--md-focus-ring-shape: var(--md-menu-container-shape, var(--md-sys-shape-corner-extra-small, 4px))}.menu{border-radius:var(--md-menu-container-shape, var(--md-sys-shape-corner-extra-small, 4px));display:none;inset:auto;border:none;padding:0px;overflow:visible;background-color:rgba(0,0,0,0);color:inherit;opacity:0;z-index:20;position:absolute;user-select:none;max-height:inherit;height:inherit;min-width:inherit;max-width:inherit;scrollbar-width:inherit}.menu::backdrop{display:none}.fixed{position:fixed}.items{display:block;list-style-type:none;margin:0;outline:none;box-sizing:border-box;background-color:var(--md-menu-container-color, var(--md-sys-color-surface-container, #f3edf7));height:inherit;max-height:inherit;overflow:auto;min-width:inherit;max-width:inherit;border-radius:inherit;scrollbar-width:inherit}.item-padding{padding-block:8px}.has-overflow:not([popover]) .items{overflow:visible}.has-overflow.animating .items,.animating .items{overflow:hidden}.has-overflow.animating .items{pointer-events:none}.animating ::slotted(.md-menu-hidden){opacity:0}slot{display:block;height:inherit;max-height:inherit}::slotted(:is(md-divider,[role=separator])){margin:8px 0}@media(forced-colors: active){.menu{border-style:solid;border-color:CanvasText;border-width:1px}}
`;
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let bt = class extends O {
};
bt.styles = [ir];
bt = a([
  te("md-menu")
], bt);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class or extends Pt {
  computeValidity(e) {
    return this.selectControl || (this.selectControl = document.createElement("select")), St(p`<option value=${e.value}></option>`, this.selectControl), this.selectControl.value = e.value, this.selectControl.required = e.required, {
      validity: this.selectControl.validity,
      validationMessage: this.selectControl.validationMessage
    };
  }
  equals(e, t) {
    return e.value === t.value && e.required === t.required;
  }
  copy({ value: e, required: t }) {
    return { value: e, required: t };
  }
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function rr(o) {
  const e = [];
  for (let t = 0; t < o.length; t++) {
    const i = o[t];
    i.selected && e.push([i, t]);
  }
  return e;
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
var ni;
const Ve = Symbol("value"), nr = yi(Ot(zt(Rt(I))));
class S extends nr {
  /**
   * The value of the currently selected option.
   *
   * Note: For SSR, set `[selected]` on the requested option and `displayText`
   * rather than setting `value` setting `value` will incur a DOM query.
   */
  get value() {
    return this[Ve];
  }
  set value(e) {
    this.lastUserSetValue = e, this.select(e);
  }
  get options() {
    var e;
    return ((e = this.menu) == null ? void 0 : e.items) ?? [];
  }
  /**
   * The index of the currently selected option.
   *
   * Note: For SSR, set `[selected]` on the requested option and `displayText`
   * rather than setting `selectedIndex` setting `selectedIndex` will incur a
   * DOM query.
   */
  get selectedIndex() {
    const [e, t] = (this.getSelectedOptions() ?? [])[0] ?? [];
    return t ?? -1;
  }
  set selectedIndex(e) {
    this.lastUserSetSelectedIndex = e, this.selectIndex(e);
  }
  /**
   * Returns an array of selected options.
   *
   * NOTE: md-select only supports single selection.
   */
  get selectedOptions() {
    return (this.getSelectedOptions() ?? []).map(([e]) => e);
  }
  get hasError() {
    return this.error || this.nativeError;
  }
  constructor() {
    super(), this.quick = !1, this.required = !1, this.errorText = "", this.label = "", this.noAsterisk = !1, this.supportingText = "", this.error = !1, this.menuPositioning = "popover", this.clampMenuWidth = !1, this.typeaheadDelay = Ai, this.hasLeadingIcon = !1, this.displayText = "", this.menuAlign = "start", this[ni] = "", this.lastUserSetValue = null, this.lastUserSetSelectedIndex = null, this.lastSelectedOption = null, this.lastSelectedOptionRecords = [], this.nativeError = !1, this.nativeErrorText = "", this.focused = !1, this.open = !1, this.defaultFocus = J.NONE, this.prevOpen = this.open, this.selectWidth = 0, this.addEventListener("focus", this.handleFocus.bind(this)), this.addEventListener("blur", this.handleBlur.bind(this));
  }
  /**
   * Selects an option given the value of the option, and updates MdSelect's
   * value.
   */
  select(e) {
    const t = this.options.find((i) => i.value === e);
    t && this.selectItem(t);
  }
  /**
   * Selects an option given the index of the option, and updates MdSelect's
   * value.
   */
  selectIndex(e) {
    const t = this.options[e];
    t && this.selectItem(t);
  }
  /**
   * Reset the select to its default value.
   */
  reset() {
    for (const e of this.options)
      e.selected = e.hasAttribute("selected");
    this.updateValueAndDisplayText(), this.nativeError = !1, this.nativeErrorText = "";
  }
  [(ni = Ve, Xe)](e) {
    var i;
    e == null || e.preventDefault();
    const t = this.getErrorText();
    this.nativeError = !!e, this.nativeErrorText = this.validationMessage, t === this.getErrorText() && ((i = this.field) == null || i.reannounceError());
  }
  update(e) {
    if (this.hasUpdated || this.initUserSelection(), this.prevOpen !== this.open && this.open) {
      const t = this.getBoundingClientRect();
      this.selectWidth = t.width;
    }
    this.prevOpen = this.open, super.update(e);
  }
  render() {
    return p`
      <span
        class="select ${ne(this.getRenderClasses())}"
        @focusout=${this.handleFocusout}>
        ${this.renderField()} ${this.renderMenu()}
      </span>
    `;
  }
  async firstUpdated(e) {
    var t;
    await ((t = this.menu) == null ? void 0 : t.updateComplete), this.lastSelectedOptionRecords.length || this.initUserSelection(), !this.lastSelectedOptionRecords.length && !this.options.length && setTimeout(() => {
      this.updateValueAndDisplayText();
    }), super.firstUpdated(e);
  }
  getRenderClasses() {
    return {
      disabled: this.disabled,
      error: this.error,
      open: this.open
    };
  }
  renderField() {
    return fi`
      <${this.fieldTag}
          aria-haspopup="listbox"
          role="combobox"
          part="field"
          id="field"
          tabindex=${this.disabled ? "-1" : "0"}
          aria-label=${this.ariaLabel || b}
          aria-describedby="description"
          aria-expanded=${this.open ? "true" : "false"}
          aria-controls="listbox"
          class="field"
          label=${this.label}
          ?no-asterisk=${this.noAsterisk}
          .focused=${this.focused || this.open}
          .populated=${!!this.displayText}
          .disabled=${this.disabled}
          .required=${this.required}
          .error=${this.hasError}
          ?has-start=${this.hasLeadingIcon}
          has-end
          supporting-text=${this.supportingText}
          error-text=${this.getErrorText()}
          @keydown=${this.handleKeydown}
          @click=${this.handleClick}>
         ${this.renderFieldContent()}
         <div id="description" slot="aria-describedby"></div>
      </${this.fieldTag}>`;
  }
  renderFieldContent() {
    return [
      this.renderLeadingIcon(),
      this.renderLabel(),
      this.renderTrailingIcon()
    ];
  }
  renderLeadingIcon() {
    return p`
      <span class="icon leading" slot="start">
        <slot name="leading-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `;
  }
  renderTrailingIcon() {
    return p`
      <span class="icon trailing" slot="end">
        <slot name="trailing-icon" @slotchange=${this.handleIconChange}>
          <svg height="5" viewBox="7 10 10 5" focusable="false">
            <polygon
              class="down"
              stroke="none"
              fill-rule="evenodd"
              points="7 10 12 15 17 10"></polygon>
            <polygon
              class="up"
              stroke="none"
              fill-rule="evenodd"
              points="7 15 12 10 17 15"></polygon>
          </svg>
        </slot>
      </span>
    `;
  }
  renderLabel() {
    return p`<div id="label">${this.displayText || p`&nbsp;`}</div>`;
  }
  renderMenu() {
    const e = this.label || this.ariaLabel;
    return p`<div class="menu-wrapper">
      <md-menu
        id="listbox"
        .defaultFocus=${this.defaultFocus}
        role="listbox"
        tabindex="-1"
        aria-label=${e || b}
        stay-open-on-focusout
        part="menu"
        exportparts="focus-ring: menu-focus-ring"
        anchor="field"
        style=${Ye({
      "--__menu-min-width": `${this.selectWidth}px`,
      "--__menu-max-width": this.clampMenuWidth ? `${this.selectWidth}px` : void 0
    })}
        no-navigation-wrap
        .open=${this.open}
        .quick=${this.quick}
        .positioning=${this.menuPositioning}
        .typeaheadDelay=${this.typeaheadDelay}
        .anchorCorner=${this.menuAlign === "start" ? "end-start" : "end-end"}
        .menuCorner=${this.menuAlign === "start" ? "start-start" : "start-end"}
        @opening=${this.handleOpening}
        @opened=${this.redispatchEvent}
        @closing=${this.redispatchEvent}
        @closed=${this.handleClosed}
        @close-menu=${this.handleCloseMenu}
        @request-selection=${this.handleRequestSelection}
        @request-deselection=${this.handleRequestDeselection}>
        ${this.renderMenuContent()}
      </md-menu>
    </div>`;
  }
  renderMenuContent() {
    return p`<slot></slot>`;
  }
  /**
   * Handles opening the select on keydown and typahead selection when the menu
   * is closed.
   */
  handleKeydown(e) {
    var n, s;
    if (this.open || this.disabled || !this.menu)
      return;
    const t = this.menu.typeaheadController, i = e.code === "Space" || e.code === "ArrowDown" || e.code === "ArrowUp" || e.code === "End" || e.code === "Home" || e.code === "Enter";
    if (!t.isTypingAhead && i) {
      switch (e.preventDefault(), this.open = !0, e.code) {
        case "Space":
        case "ArrowDown":
        case "Enter":
          this.defaultFocus = J.NONE;
          break;
        case "End":
          this.defaultFocus = J.LAST_ITEM;
          break;
        case "ArrowUp":
        case "Home":
          this.defaultFocus = J.FIRST_ITEM;
          break;
      }
      return;
    }
    if (e.key.length === 1) {
      t.onKeydown(e), e.preventDefault();
      const { lastActiveRecord: l } = t;
      if (!l)
        return;
      (s = (n = this.labelEl) == null ? void 0 : n.setAttribute) == null || s.call(n, "aria-live", "polite"), this.selectItem(l[j.ITEM]) && this.dispatchInteractionEvents();
    }
  }
  handleClick() {
    this.open = !this.open;
  }
  handleFocus() {
    this.focused = !0;
  }
  handleBlur() {
    this.focused = !1;
  }
  /**
   * Handles closing the menu when the focus leaves the select's subtree.
   */
  handleFocusout(e) {
    e.relatedTarget && gt(e.relatedTarget, this) || (this.open = !1);
  }
  /**
   * Gets a list of all selected select options as a list item record array.
   *
   * @return An array of selected list option records.
   */
  getSelectedOptions() {
    if (!this.menu)
      return this.lastSelectedOptionRecords = [], null;
    const e = this.menu.items;
    return this.lastSelectedOptionRecords = rr(e), this.lastSelectedOptionRecords;
  }
  async getUpdateComplete() {
    var e;
    return await ((e = this.menu) == null ? void 0 : e.updateComplete), super.getUpdateComplete();
  }
  /**
   * Gets the selected options from the DOM, and updates the value and display
   * text to the first selected option's value and headline respectively.
   *
   * @return Whether or not the selected option has changed since last update.
   */
  updateValueAndDisplayText() {
    const e = this.getSelectedOptions() ?? [];
    let t = !1;
    if (e.length) {
      const [i] = e[0];
      t = this.lastSelectedOption !== i, this.lastSelectedOption = i, this[Ve] = i.value, this.displayText = i.displayText;
    } else
      t = this.lastSelectedOption !== null, this.lastSelectedOption = null, this[Ve] = "", this.displayText = "";
    return t;
  }
  /**
   * Focuses and activates the last selected item upon opening, and resets other
   * active items.
   */
  async handleOpening(e) {
    var n, s, l;
    if ((s = (n = this.labelEl) == null ? void 0 : n.removeAttribute) == null || s.call(n, "aria-live"), this.redispatchEvent(e), this.defaultFocus !== J.NONE)
      return;
    const t = this.menu.items, i = (l = ke(t)) == null ? void 0 : l.item;
    let [r] = this.lastSelectedOptionRecords[0] ?? [null];
    i && i !== r && (i.tabIndex = -1), r = r ?? t[0], r && (r.tabIndex = 0, r.focus());
  }
  redispatchEvent(e) {
    It(this, e);
  }
  handleClosed(e) {
    this.open = !1, this.redispatchEvent(e);
  }
  /**
   * Determines the reason for closing, and updates the UI accordingly.
   */
  handleCloseMenu(e) {
    const t = e.detail.reason, i = e.detail.itemPath[0];
    this.open = !1;
    let r = !1;
    t.kind === "click-selection" ? r = this.selectItem(i) : t.kind === "keydown" && Qo(t.key) ? r = this.selectItem(i) : (i.tabIndex = -1, i.blur()), r && this.dispatchInteractionEvents();
  }
  /**
   * Selects a given option, deselects other options, and updates the UI.
   *
   * @return Whether the last selected option has changed.
   */
  selectItem(e) {
    return (this.getSelectedOptions() ?? []).forEach(([i]) => {
      e !== i && (i.selected = !1);
    }), e.selected = !0, this.updateValueAndDisplayText();
  }
  /**
   * Handles updating selection when an option element requests selection via
   * property / attribute change.
   */
  handleRequestSelection(e) {
    const t = e.target;
    this.lastSelectedOptionRecords.some(([i]) => i === t) || this.selectItem(t);
  }
  /**
   * Handles updating selection when an option element requests deselection via
   * property / attribute change.
   */
  handleRequestDeselection(e) {
    const t = e.target;
    this.lastSelectedOptionRecords.some(([i]) => i === t) && this.updateValueAndDisplayText();
  }
  /**
   * Attempts to initialize the selected option from user-settable values like
   * SSR, setting `value`, or `selectedIndex` at startup.
   */
  initUserSelection() {
    this.lastUserSetValue && !this.lastSelectedOptionRecords.length ? this.select(this.lastUserSetValue) : this.lastUserSetSelectedIndex !== null && !this.lastSelectedOptionRecords.length ? this.selectIndex(this.lastUserSetSelectedIndex) : this.updateValueAndDisplayText();
  }
  handleIconChange() {
    this.hasLeadingIcon = this.leadingIcons.length > 0;
  }
  /**
   * Dispatches the `input` and `change` events.
   */
  dispatchInteractionEvents() {
    this.dispatchEvent(new Event("input", { bubbles: !0, composed: !0 })), this.dispatchEvent(new Event("change", { bubbles: !0 }));
  }
  getErrorText() {
    return this.error ? this.errorText : this.nativeErrorText;
  }
  [we]() {
    return this.value;
  }
  formResetCallback() {
    this.reset();
  }
  formStateRestoreCallback(e) {
    this.value = e;
  }
  click() {
    var e;
    (e = this.field) == null || e.click();
  }
  [ze]() {
    return new or(() => this);
  }
  [Pe]() {
    return this.field;
  }
}
Ze(S);
S.shadowRootOptions = {
  ...I.shadowRootOptions,
  delegatesFocus: !0
};
a([
  c({ type: Boolean })
], S.prototype, "quick", void 0);
a([
  c({ type: Boolean })
], S.prototype, "required", void 0);
a([
  c({ type: String, attribute: "error-text" })
], S.prototype, "errorText", void 0);
a([
  c()
], S.prototype, "label", void 0);
a([
  c({ type: Boolean, attribute: "no-asterisk" })
], S.prototype, "noAsterisk", void 0);
a([
  c({ type: String, attribute: "supporting-text" })
], S.prototype, "supportingText", void 0);
a([
  c({ type: Boolean, reflect: !0 })
], S.prototype, "error", void 0);
a([
  c({ attribute: "menu-positioning" })
], S.prototype, "menuPositioning", void 0);
a([
  c({ type: Boolean, attribute: "clamp-menu-width" })
], S.prototype, "clampMenuWidth", void 0);
a([
  c({ type: Number, attribute: "typeahead-delay" })
], S.prototype, "typeaheadDelay", void 0);
a([
  c({ type: Boolean, attribute: "has-leading-icon" })
], S.prototype, "hasLeadingIcon", void 0);
a([
  c({ attribute: "display-text" })
], S.prototype, "displayText", void 0);
a([
  c({ attribute: "menu-align" })
], S.prototype, "menuAlign", void 0);
a([
  c()
], S.prototype, "value", null);
a([
  c({ type: Number, attribute: "selected-index" })
], S.prototype, "selectedIndex", null);
a([
  z()
], S.prototype, "nativeError", void 0);
a([
  z()
], S.prototype, "nativeErrorText", void 0);
a([
  z()
], S.prototype, "focused", void 0);
a([
  z()
], S.prototype, "open", void 0);
a([
  z()
], S.prototype, "defaultFocus", void 0);
a([
  F(".field")
], S.prototype, "field", void 0);
a([
  F("md-menu")
], S.prototype, "menu", void 0);
a([
  F("#label")
], S.prototype, "labelEl", void 0);
a([
  ve({ slot: "leading-icon", flatten: !0 })
], S.prototype, "leadingIcons", void 0);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class sr extends S {
  constructor() {
    super(...arguments), this.fieldTag = kt`md-outlined-field`;
  }
}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ar = B`:host{--_text-field-disabled-input-text-color: var(--md-outlined-select-text-field-disabled-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-input-text-opacity: var(--md-outlined-select-text-field-disabled-input-text-opacity, 0.38);--_text-field-disabled-label-text-color: var(--md-outlined-select-text-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-label-text-opacity: var(--md-outlined-select-text-field-disabled-label-text-opacity, 0.38);--_text-field-disabled-leading-icon-color: var(--md-outlined-select-text-field-disabled-leading-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-leading-icon-opacity: var(--md-outlined-select-text-field-disabled-leading-icon-opacity, 0.38);--_text-field-disabled-outline-color: var(--md-outlined-select-text-field-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-outline-opacity: var(--md-outlined-select-text-field-disabled-outline-opacity, 0.12);--_text-field-disabled-outline-width: var(--md-outlined-select-text-field-disabled-outline-width, 1px);--_text-field-disabled-supporting-text-color: var(--md-outlined-select-text-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-supporting-text-opacity: var(--md-outlined-select-text-field-disabled-supporting-text-opacity, 0.38);--_text-field-disabled-trailing-icon-color: var(--md-outlined-select-text-field-disabled-trailing-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-trailing-icon-opacity: var(--md-outlined-select-text-field-disabled-trailing-icon-opacity, 0.38);--_text-field-error-focus-input-text-color: var(--md-outlined-select-text-field-error-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-focus-label-text-color: var(--md-outlined-select-text-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-leading-icon-color: var(--md-outlined-select-text-field-error-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-error-focus-outline-color: var(--md-outlined-select-text-field-error-focus-outline-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-supporting-text-color: var(--md-outlined-select-text-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-trailing-icon-color: var(--md-outlined-select-text-field-error-focus-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_text-field-error-hover-input-text-color: var(--md-outlined-select-text-field-error-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-hover-label-text-color: var(--md-outlined-select-text-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_text-field-error-hover-leading-icon-color: var(--md-outlined-select-text-field-error-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-error-hover-outline-color: var(--md-outlined-select-text-field-error-hover-outline-color, var(--md-sys-color-on-error-container, #410e0b));--_text-field-error-hover-supporting-text-color: var(--md-outlined-select-text-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-hover-trailing-icon-color: var(--md-outlined-select-text-field-error-hover-trailing-icon-color, var(--md-sys-color-on-error-container, #410e0b));--_text-field-error-input-text-color: var(--md-outlined-select-text-field-error-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-label-text-color: var(--md-outlined-select-text-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-leading-icon-color: var(--md-outlined-select-text-field-error-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-error-outline-color: var(--md-outlined-select-text-field-error-outline-color, var(--md-sys-color-error, #b3261e));--_text-field-error-supporting-text-color: var(--md-outlined-select-text-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-trailing-icon-color: var(--md-outlined-select-text-field-error-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_text-field-focus-input-text-color: var(--md-outlined-select-text-field-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-focus-label-text-color: var(--md-outlined-select-text-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_text-field-focus-leading-icon-color: var(--md-outlined-select-text-field-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-focus-outline-color: var(--md-outlined-select-text-field-focus-outline-color, var(--md-sys-color-primary, #6750a4));--_text-field-focus-outline-width: var(--md-outlined-select-text-field-focus-outline-width, 3px);--_text-field-focus-supporting-text-color: var(--md-outlined-select-text-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-focus-trailing-icon-color: var(--md-outlined-select-text-field-focus-trailing-icon-color, var(--md-sys-color-primary, #6750a4));--_text-field-hover-input-text-color: var(--md-outlined-select-text-field-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-label-text-color: var(--md-outlined-select-text-field-hover-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-leading-icon-color: var(--md-outlined-select-text-field-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-hover-outline-color: var(--md-outlined-select-text-field-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-outline-width: var(--md-outlined-select-text-field-hover-outline-width, 1px);--_text-field-hover-supporting-text-color: var(--md-outlined-select-text-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-hover-trailing-icon-color: var(--md-outlined-select-text-field-hover-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-input-text-color: var(--md-outlined-select-text-field-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-input-text-font: var(--md-outlined-select-text-field-input-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_text-field-input-text-line-height: var(--md-outlined-select-text-field-input-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_text-field-input-text-size: var(--md-outlined-select-text-field-input-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_text-field-input-text-weight: var(--md-outlined-select-text-field-input-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_text-field-label-text-color: var(--md-outlined-select-text-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-label-text-font: var(--md-outlined-select-text-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_text-field-label-text-line-height: var(--md-outlined-select-text-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_text-field-label-text-populated-line-height: var(--md-outlined-select-text-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_text-field-label-text-populated-size: var(--md-outlined-select-text-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_text-field-label-text-size: var(--md-outlined-select-text-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_text-field-label-text-weight: var(--md-outlined-select-text-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_text-field-leading-icon-color: var(--md-outlined-select-text-field-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-leading-icon-size: var(--md-outlined-select-text-field-leading-icon-size, 24px);--_text-field-outline-color: var(--md-outlined-select-text-field-outline-color, var(--md-sys-color-outline, #79747e));--_text-field-outline-width: var(--md-outlined-select-text-field-outline-width, 1px);--_text-field-supporting-text-color: var(--md-outlined-select-text-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-supporting-text-font: var(--md-outlined-select-text-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_text-field-supporting-text-line-height: var(--md-outlined-select-text-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_text-field-supporting-text-size: var(--md-outlined-select-text-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_text-field-supporting-text-weight: var(--md-outlined-select-text-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_text-field-trailing-icon-color: var(--md-outlined-select-text-field-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-trailing-icon-size: var(--md-outlined-select-text-field-trailing-icon-size, 24px);--_text-field-container-shape-start-start: var(--md-outlined-select-text-field-container-shape-start-start, var(--md-outlined-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_text-field-container-shape-start-end: var(--md-outlined-select-text-field-container-shape-start-end, var(--md-outlined-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_text-field-container-shape-end-end: var(--md-outlined-select-text-field-container-shape-end-end, var(--md-outlined-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_text-field-container-shape-end-start: var(--md-outlined-select-text-field-container-shape-end-start, var(--md-outlined-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--md-outlined-field-container-shape-end-end: var(--_text-field-container-shape-end-end);--md-outlined-field-container-shape-end-start: var(--_text-field-container-shape-end-start);--md-outlined-field-container-shape-start-end: var(--_text-field-container-shape-start-end);--md-outlined-field-container-shape-start-start: var(--_text-field-container-shape-start-start);--md-outlined-field-content-color: var(--_text-field-input-text-color);--md-outlined-field-content-font: var(--_text-field-input-text-font);--md-outlined-field-content-line-height: var(--_text-field-input-text-line-height);--md-outlined-field-content-size: var(--_text-field-input-text-size);--md-outlined-field-content-weight: var(--_text-field-input-text-weight);--md-outlined-field-disabled-content-color: var(--_text-field-disabled-input-text-color);--md-outlined-field-disabled-content-opacity: var(--_text-field-disabled-input-text-opacity);--md-outlined-field-disabled-label-text-color: var(--_text-field-disabled-label-text-color);--md-outlined-field-disabled-label-text-opacity: var(--_text-field-disabled-label-text-opacity);--md-outlined-field-disabled-leading-content-color: var(--_text-field-disabled-leading-icon-color);--md-outlined-field-disabled-leading-content-opacity: var(--_text-field-disabled-leading-icon-opacity);--md-outlined-field-disabled-outline-color: var(--_text-field-disabled-outline-color);--md-outlined-field-disabled-outline-opacity: var(--_text-field-disabled-outline-opacity);--md-outlined-field-disabled-outline-width: var(--_text-field-disabled-outline-width);--md-outlined-field-disabled-supporting-text-color: var(--_text-field-disabled-supporting-text-color);--md-outlined-field-disabled-supporting-text-opacity: var(--_text-field-disabled-supporting-text-opacity);--md-outlined-field-disabled-trailing-content-color: var(--_text-field-disabled-trailing-icon-color);--md-outlined-field-disabled-trailing-content-opacity: var(--_text-field-disabled-trailing-icon-opacity);--md-outlined-field-error-content-color: var(--_text-field-error-input-text-color);--md-outlined-field-error-focus-content-color: var(--_text-field-error-focus-input-text-color);--md-outlined-field-error-focus-label-text-color: var(--_text-field-error-focus-label-text-color);--md-outlined-field-error-focus-leading-content-color: var(--_text-field-error-focus-leading-icon-color);--md-outlined-field-error-focus-outline-color: var(--_text-field-error-focus-outline-color);--md-outlined-field-error-focus-supporting-text-color: var(--_text-field-error-focus-supporting-text-color);--md-outlined-field-error-focus-trailing-content-color: var(--_text-field-error-focus-trailing-icon-color);--md-outlined-field-error-hover-content-color: var(--_text-field-error-hover-input-text-color);--md-outlined-field-error-hover-label-text-color: var(--_text-field-error-hover-label-text-color);--md-outlined-field-error-hover-leading-content-color: var(--_text-field-error-hover-leading-icon-color);--md-outlined-field-error-hover-outline-color: var(--_text-field-error-hover-outline-color);--md-outlined-field-error-hover-supporting-text-color: var(--_text-field-error-hover-supporting-text-color);--md-outlined-field-error-hover-trailing-content-color: var(--_text-field-error-hover-trailing-icon-color);--md-outlined-field-error-label-text-color: var(--_text-field-error-label-text-color);--md-outlined-field-error-leading-content-color: var(--_text-field-error-leading-icon-color);--md-outlined-field-error-outline-color: var(--_text-field-error-outline-color);--md-outlined-field-error-supporting-text-color: var(--_text-field-error-supporting-text-color);--md-outlined-field-error-trailing-content-color: var(--_text-field-error-trailing-icon-color);--md-outlined-field-focus-content-color: var(--_text-field-focus-input-text-color);--md-outlined-field-focus-label-text-color: var(--_text-field-focus-label-text-color);--md-outlined-field-focus-leading-content-color: var(--_text-field-focus-leading-icon-color);--md-outlined-field-focus-outline-color: var(--_text-field-focus-outline-color);--md-outlined-field-focus-outline-width: var(--_text-field-focus-outline-width);--md-outlined-field-focus-supporting-text-color: var(--_text-field-focus-supporting-text-color);--md-outlined-field-focus-trailing-content-color: var(--_text-field-focus-trailing-icon-color);--md-outlined-field-hover-content-color: var(--_text-field-hover-input-text-color);--md-outlined-field-hover-label-text-color: var(--_text-field-hover-label-text-color);--md-outlined-field-hover-leading-content-color: var(--_text-field-hover-leading-icon-color);--md-outlined-field-hover-outline-color: var(--_text-field-hover-outline-color);--md-outlined-field-hover-outline-width: var(--_text-field-hover-outline-width);--md-outlined-field-hover-supporting-text-color: var(--_text-field-hover-supporting-text-color);--md-outlined-field-hover-trailing-content-color: var(--_text-field-hover-trailing-icon-color);--md-outlined-field-label-text-color: var(--_text-field-label-text-color);--md-outlined-field-label-text-font: var(--_text-field-label-text-font);--md-outlined-field-label-text-line-height: var(--_text-field-label-text-line-height);--md-outlined-field-label-text-populated-line-height: var(--_text-field-label-text-populated-line-height);--md-outlined-field-label-text-populated-size: var(--_text-field-label-text-populated-size);--md-outlined-field-label-text-size: var(--_text-field-label-text-size);--md-outlined-field-label-text-weight: var(--_text-field-label-text-weight);--md-outlined-field-leading-content-color: var(--_text-field-leading-icon-color);--md-outlined-field-outline-color: var(--_text-field-outline-color);--md-outlined-field-outline-width: var(--_text-field-outline-width);--md-outlined-field-supporting-text-color: var(--_text-field-supporting-text-color);--md-outlined-field-supporting-text-font: var(--_text-field-supporting-text-font);--md-outlined-field-supporting-text-line-height: var(--_text-field-supporting-text-line-height);--md-outlined-field-supporting-text-size: var(--_text-field-supporting-text-size);--md-outlined-field-supporting-text-weight: var(--_text-field-supporting-text-weight);--md-outlined-field-trailing-content-color: var(--_text-field-trailing-icon-color)}[has-start] .icon.leading{font-size:var(--_text-field-leading-icon-size);height:var(--_text-field-leading-icon-size);width:var(--_text-field-leading-icon-size)}.icon.trailing{font-size:var(--_text-field-trailing-icon-size);height:var(--_text-field-trailing-icon-size);width:var(--_text-field-trailing-icon-size)}
`;
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const lr = B`:host{color:unset;min-width:210px;display:flex}.field{cursor:default;outline:none}.select{position:relative;flex-direction:column}.icon.trailing svg,.icon ::slotted(*){fill:currentColor}.icon ::slotted(*){width:inherit;height:inherit;font-size:inherit}.icon slot{display:flex;height:100%;width:100%;align-items:center;justify-content:center}.icon.trailing :is(.up,.down){opacity:0;transition:opacity 75ms linear 75ms}.select:not(.open) .down,.select.open .up{opacity:1}.field,.select,md-menu{min-width:inherit;width:inherit;max-width:inherit;display:flex}md-menu{min-width:var(--__menu-min-width);max-width:var(--__menu-max-width, inherit)}.menu-wrapper{width:0px;height:0px;max-width:inherit}md-menu ::slotted(:not[disabled]){cursor:pointer}.field,.select{width:100%}:host{display:inline-flex}:host([disabled]){pointer-events:none}
`;
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let yt = class extends sr {
};
yt.styles = [lr, ar];
yt = a([
  te("md-outlined-select")
], yt);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const dr = B`:host{display:flex;--md-ripple-hover-color: var(--md-menu-item-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-hover-opacity: var(--md-menu-item-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-menu-item-pressed-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-pressed-opacity: var(--md-menu-item-pressed-state-layer-opacity, 0.12)}:host([disabled]){opacity:var(--md-menu-item-disabled-opacity, 0.3);pointer-events:none}md-focus-ring{z-index:1;--md-focus-ring-shape: 8px}a,button,li{background:none;border:none;padding:0;margin:0;text-align:unset;text-decoration:none}.list-item{border-radius:inherit;display:flex;flex:1;max-width:inherit;min-width:inherit;outline:none;-webkit-tap-highlight-color:rgba(0,0,0,0)}.list-item:not(.disabled){cursor:pointer}[slot=container]{pointer-events:none}md-ripple{border-radius:inherit}md-item{border-radius:inherit;flex:1;color:var(--md-menu-item-label-text-color, var(--md-sys-color-on-surface, #1d1b20));font-family:var(--md-menu-item-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-menu-item-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));line-height:var(--md-menu-item-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));font-weight:var(--md-menu-item-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));min-height:var(--md-menu-item-one-line-container-height, 56px);padding-top:var(--md-menu-item-top-space, 12px);padding-bottom:var(--md-menu-item-bottom-space, 12px);padding-inline-start:var(--md-menu-item-leading-space, 16px);padding-inline-end:var(--md-menu-item-trailing-space, 16px)}md-item[multiline]{min-height:var(--md-menu-item-two-line-container-height, 72px)}[slot=supporting-text]{color:var(--md-menu-item-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-menu-item-supporting-text-font, var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-menu-item-supporting-text-size, var(--md-sys-typescale-body-medium-size, 0.875rem));line-height:var(--md-menu-item-supporting-text-line-height, var(--md-sys-typescale-body-medium-line-height, 1.25rem));font-weight:var(--md-menu-item-supporting-text-weight, var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400)))}[slot=trailing-supporting-text]{color:var(--md-menu-item-trailing-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-menu-item-trailing-supporting-text-font, var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-menu-item-trailing-supporting-text-size, var(--md-sys-typescale-label-small-size, 0.6875rem));line-height:var(--md-menu-item-trailing-supporting-text-line-height, var(--md-sys-typescale-label-small-line-height, 1rem));font-weight:var(--md-menu-item-trailing-supporting-text-weight, var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500)))}:is([slot=start],[slot=end])::slotted(*){fill:currentColor}[slot=start]{color:var(--md-menu-item-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f))}[slot=end]{color:var(--md-menu-item-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f))}.list-item{background-color:var(--md-menu-item-container-color, transparent)}.list-item.selected{background-color:var(--md-menu-item-selected-container-color, var(--md-sys-color-secondary-container, #e8def8))}.selected:not(.disabled) ::slotted(*){color:var(--md-menu-item-selected-label-text-color, var(--md-sys-color-on-secondary-container, #1d192b))}@media(forced-colors: active){:host([disabled]),:host([disabled]) slot{color:GrayText;opacity:1}.list-item{position:relative}.list-item.selected::before{content:"";position:absolute;inset:0;box-sizing:border-box;border-radius:inherit;pointer-events:none;border:3px double CanvasText}}
`;
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Dt extends I {
  constructor() {
    super(...arguments), this.multiline = !1;
  }
  render() {
    return p`
      <slot name="container"></slot>
      <slot class="non-text" name="start"></slot>
      <div class="text">
        <slot name="overline" @slotchange=${this.handleTextSlotChange}></slot>
        <slot
          class="default-slot"
          @slotchange=${this.handleTextSlotChange}></slot>
        <slot name="headline" @slotchange=${this.handleTextSlotChange}></slot>
        <slot
          name="supporting-text"
          @slotchange=${this.handleTextSlotChange}></slot>
      </div>
      <slot class="non-text" name="trailing-supporting-text"></slot>
      <slot class="non-text" name="end"></slot>
    `;
  }
  handleTextSlotChange() {
    let e = !1, t = 0;
    for (const i of this.textSlots)
      if (cr(i) && (t += 1), t > 1) {
        e = !0;
        break;
      }
    this.multiline = e;
  }
}
a([
  c({ type: Boolean, reflect: !0 })
], Dt.prototype, "multiline", void 0);
a([
  oo(".text slot")
], Dt.prototype, "textSlots", void 0);
function cr(o) {
  var e;
  for (const t of o.assignedNodes({ flatten: !0 })) {
    const i = t.nodeType === Node.ELEMENT_NODE, r = t.nodeType === Node.TEXT_NODE && ((e = t.textContent) == null ? void 0 : e.match(/\S/));
    if (i || r)
      return !0;
  }
  return !1;
}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ur = B`:host{color:var(--md-sys-color-on-surface, #1d1b20);font-family:var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-body-large-size, 1rem);font-weight:var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400));line-height:var(--md-sys-typescale-body-large-line-height, 1.5rem);align-items:center;box-sizing:border-box;display:flex;gap:16px;min-height:56px;overflow:hidden;padding:12px 16px;position:relative;text-overflow:ellipsis}:host([multiline]){min-height:72px}[name=overline]{color:var(--md-sys-color-on-surface-variant, #49454f);font-family:var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-label-small-size, 0.6875rem);font-weight:var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500));line-height:var(--md-sys-typescale-label-small-line-height, 1rem)}[name=supporting-text]{color:var(--md-sys-color-on-surface-variant, #49454f);font-family:var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-body-medium-size, 0.875rem);font-weight:var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400));line-height:var(--md-sys-typescale-body-medium-line-height, 1.25rem)}[name=trailing-supporting-text]{color:var(--md-sys-color-on-surface-variant, #49454f);font-family:var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-label-small-size, 0.6875rem);font-weight:var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500));line-height:var(--md-sys-typescale-label-small-line-height, 1rem)}[name=container]::slotted(*){inset:0;position:absolute}.default-slot{display:inline}.default-slot,.text ::slotted(*){overflow:hidden;text-overflow:ellipsis}.text{display:flex;flex:1;flex-direction:column;overflow:hidden}
`;
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let xt = class extends Dt {
};
xt.styles = [ur];
xt = a([
  te("md-item")
], xt);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class pr {
  /**
   * @param host The MenuItem in which to attach this controller to.
   * @param config The object that configures this controller's behavior.
   */
  constructor(e, t) {
    this.host = e, this.internalTypeaheadText = null, this.onClick = () => {
      this.host.keepOpen || this.host.dispatchEvent(ii(this.host, {
        kind: oi.CLICK_SELECTION
      }));
    }, this.onKeydown = (i) => {
      if (this.host.href && i.code === "Enter") {
        const n = this.getInteractiveElement();
        n instanceof HTMLAnchorElement && n.click();
      }
      if (i.defaultPrevented)
        return;
      const r = i.code;
      this.host.keepOpen && r !== "Escape" || Ti(r) && (i.preventDefault(), this.host.dispatchEvent(ii(this.host, {
        kind: oi.KEYDOWN,
        key: r
      })));
    }, this.getHeadlineElements = t.getHeadlineElements, this.getSupportingTextElements = t.getSupportingTextElements, this.getDefaultElements = t.getDefaultElements, this.getInteractiveElement = t.getInteractiveElement, this.host.addController(this);
  }
  /**
   * The text that is selectable via typeahead. If not set, defaults to the
   * innerText of the item slotted into the `"headline"` slot, and if there are
   * no slotted elements into headline, then it checks the _default_ slot, and
   * then the `"supporting-text"` slot if nothing is in _default_.
   */
  get typeaheadText() {
    if (this.internalTypeaheadText !== null)
      return this.internalTypeaheadText;
    const e = this.getHeadlineElements(), t = [];
    return e.forEach((i) => {
      i.textContent && i.textContent.trim() && t.push(i.textContent.trim());
    }), t.length === 0 && this.getDefaultElements().forEach((i) => {
      i.textContent && i.textContent.trim() && t.push(i.textContent.trim());
    }), t.length === 0 && this.getSupportingTextElements().forEach((i) => {
      i.textContent && i.textContent.trim() && t.push(i.textContent.trim());
    }), t.join(" ");
  }
  /**
   * The recommended tag name to render as the list item.
   */
  get tagName() {
    switch (this.host.type) {
      case "link":
        return "a";
      case "button":
        return "button";
      default:
      case "menuitem":
      case "option":
        return "li";
    }
  }
  /**
   * The recommended role of the menu item.
   */
  get role() {
    return this.host.type === "option" ? "option" : "menuitem";
  }
  hostConnected() {
    this.host.toggleAttribute("md-menu-item", !0);
  }
  hostUpdate() {
    this.host.href && (this.host.type = "link");
  }
  /**
   * Use to set the typeaheadText when it changes.
   */
  setTypeaheadText(e) {
    this.internalTypeaheadText = e;
  }
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function hr() {
  return new Event("request-selection", {
    bubbles: !0,
    composed: !0
  });
}
function mr() {
  return new Event("request-deselection", {
    bubbles: !0,
    composed: !0
  });
}
class fr {
  /**
   * The recommended role of the select option.
   */
  get role() {
    return this.menuItemController.role;
  }
  /**
   * The text that is selectable via typeahead. If not set, defaults to the
   * innerText of the item slotted into the `"headline"` slot, and if there are
   * no slotted elements into headline, then it checks the _default_ slot, and
   * then the `"supporting-text"` slot if nothing is in _default_.
   */
  get typeaheadText() {
    return this.menuItemController.typeaheadText;
  }
  setTypeaheadText(e) {
    this.menuItemController.setTypeaheadText(e);
  }
  /**
   * The text that is displayed in the select field when selected. If not set,
   * defaults to the textContent of the item slotted into the `"headline"` slot,
   * and if there are no slotted elements into headline, then it checks the
   * _default_ slot, and then the `"supporting-text"` slot if nothing is in
   * _default_.
   */
  get displayText() {
    return this.internalDisplayText !== null ? this.internalDisplayText : this.menuItemController.typeaheadText;
  }
  setDisplayText(e) {
    this.internalDisplayText = e;
  }
  /**
   * @param host The SelectOption in which to attach this controller to.
   * @param config The object that configures this controller's behavior.
   */
  constructor(e, t) {
    this.host = e, this.internalDisplayText = null, this.lastSelected = this.host.selected, this.firstUpdate = !0, this.onClick = () => {
      this.menuItemController.onClick();
    }, this.onKeydown = (i) => {
      this.menuItemController.onKeydown(i);
    }, this.menuItemController = new pr(e, t), e.addController(this);
  }
  hostUpdate() {
    this.lastSelected !== this.host.selected && (this.host.ariaSelected = this.host.selected ? "true" : "false");
  }
  hostUpdated() {
    this.lastSelected !== this.host.selected && !this.firstUpdate && (this.host.selected ? this.host.dispatchEvent(hr()) : this.host.dispatchEvent(mr())), this.lastSelected = this.host.selected, this.firstUpdate = !1;
  }
}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class q extends I {
  constructor() {
    super(...arguments), this.disabled = !1, this.isMenuItem = !0, this.selected = !1, this.value = "", this.type = "option", this.selectOptionController = new fr(this, {
      getHeadlineElements: () => this.headlineElements,
      getSupportingTextElements: () => this.supportingTextElements,
      getDefaultElements: () => this.defaultElements,
      getInteractiveElement: () => this.listItemRoot
    });
  }
  /**
   * The text that is selectable via typeahead. If not set, defaults to the
   * innerText of the item slotted into the `"headline"` slot.
   */
  get typeaheadText() {
    return this.selectOptionController.typeaheadText;
  }
  set typeaheadText(e) {
    this.selectOptionController.setTypeaheadText(e);
  }
  /**
   * The text that is displayed in the select field when selected. If not set,
   * defaults to the textContent of the item slotted into the `"headline"` slot.
   */
  get displayText() {
    return this.selectOptionController.displayText;
  }
  set displayText(e) {
    this.selectOptionController.setDisplayText(e);
  }
  render() {
    return this.renderListItem(p`
      <md-item>
        <div slot="container">
          ${this.renderRipple()} ${this.renderFocusRing()}
        </div>
        <slot name="start" slot="start"></slot>
        <slot name="end" slot="end"></slot>
        ${this.renderBody()}
      </md-item>
    `);
  }
  /**
   * Renders the root list item.
   *
   * @param content the child content of the list item.
   */
  renderListItem(e) {
    return p`
      <li
        id="item"
        tabindex=${this.disabled ? -1 : 0}
        role=${this.selectOptionController.role}
        aria-label=${this.ariaLabel || b}
        aria-selected=${this.ariaSelected || b}
        aria-checked=${this.ariaChecked || b}
        aria-expanded=${this.ariaExpanded || b}
        aria-haspopup=${this.ariaHasPopup || b}
        class="list-item ${ne(this.getRenderClasses())}"
        @click=${this.selectOptionController.onClick}
        @keydown=${this.selectOptionController.onKeydown}
        >${e}</li
      >
    `;
  }
  /**
   * Handles rendering of the ripple element.
   */
  renderRipple() {
    return p` <md-ripple
      part="ripple"
      for="item"
      ?disabled=${this.disabled}></md-ripple>`;
  }
  /**
   * Handles rendering of the focus ring.
   */
  renderFocusRing() {
    return p` <md-focus-ring
      part="focus-ring"
      for="item"
      inward></md-focus-ring>`;
  }
  /**
   * Classes applied to the list item root.
   */
  getRenderClasses() {
    return {
      disabled: this.disabled,
      selected: this.selected
    };
  }
  /**
   * Handles rendering the headline and supporting text.
   */
  renderBody() {
    return p`
      <slot></slot>
      <slot name="overline" slot="overline"></slot>
      <slot name="headline" slot="headline"></slot>
      <slot name="supporting-text" slot="supporting-text"></slot>
      <slot
        name="trailing-supporting-text"
        slot="trailing-supporting-text"></slot>
    `;
  }
  focus() {
    var e;
    (e = this.listItemRoot) == null || e.focus();
  }
}
Ze(q);
q.shadowRootOptions = {
  ...I.shadowRootOptions,
  delegatesFocus: !0
};
a([
  c({ type: Boolean, reflect: !0 })
], q.prototype, "disabled", void 0);
a([
  c({ type: Boolean, attribute: "md-menu-item", reflect: !0 })
], q.prototype, "isMenuItem", void 0);
a([
  c({ type: Boolean })
], q.prototype, "selected", void 0);
a([
  c()
], q.prototype, "value", void 0);
a([
  F(".list-item")
], q.prototype, "listItemRoot", void 0);
a([
  ve({ slot: "headline" })
], q.prototype, "headlineElements", void 0);
a([
  ve({ slot: "supporting-text" })
], q.prototype, "supportingTextElements", void 0);
a([
  ro({ slot: "" })
], q.prototype, "defaultElements", void 0);
a([
  c({ attribute: "typeahead-text" })
], q.prototype, "typeaheadText", null);
a([
  c({ attribute: "display-text" })
], q.prototype, "displayText", null);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let _t = class extends q {
};
_t.styles = [dr];
_t = a([
  te("md-select-option")
], _t);
class Ii extends I {
  constructor() {
    super(), this.models = ["gemini-3.5-flash"], this.iterations = 1, this.concurrency = 25, this.instructionOverride = "", this.answerGenerationMode = "NORMAL", this.assistSkippingMode = "REQUEST_ASSIST", this.searchResultMode = "CHUNKS", this.apiTimeout = 60, this.scenarioTimeout = 120, this.runTimeout = 600;
  }
  createRenderRoot() {
    return this;
  }
  _onModelChange(e, t) {
    t.target.checked ? this.models.includes(e) || (this.models = [...this.models, e]) : this.models = this.models.filter((r) => r !== e), this._notifyChange();
  }
  _onIterationsChange(e) {
    this.iterations = parseInt(e.target.value, 10), this._notifyChange();
  }
  _onConcurrencyChange(e) {
    this.concurrency = parseInt(e.target.value, 10), this._notifyChange();
  }
  _onInstructionOverrideChange(e) {
    this.instructionOverride = e.target.value, this._notifyChange();
  }
  _onAnswerModeChange(e) {
    this.answerGenerationMode = e.target.value, this._notifyChange();
  }
  _onAssistSkippingChange(e) {
    this.assistSkippingMode = e.target.value, this._notifyChange();
  }
  _onSearchResultModeChange(e) {
    this.searchResultMode = e.target.value, this._notifyChange();
  }
  _applyPromptPreset(e) {
    e === "yahoo_concise" ? this.instructionOverride = `You are the Yahoo Enterprise Assistant.
1. Provide direct, concise, and factual answers in 1-3 sentences.
2. Base your answer strictly on the provided internal documents.
3. If explaining deprecated tools or protocols, always state the modern approved replacement.
4. Always cite the exact source document name or URL.` : e === "technical" ? this.instructionOverride = "Provide a comprehensive technical breakdown with exact version numbers, deprecation timelines, and configuration examples." : this.instructionOverride = "";
    const t = document.getElementById("config-instruction-override");
    t && (t.value = this.instructionOverride), this._notifyChange();
  }
  _onApiTimeoutChange(e) {
    this.apiTimeout = parseInt(e.target.value, 10), this._notifyChange();
  }
  _onScenarioTimeoutChange(e) {
    this.scenarioTimeout = parseInt(e.target.value, 10), this._notifyChange();
  }
  _onRunTimeoutChange(e) {
    this.runTimeout = parseInt(e.target.value, 10), this._notifyChange();
  }
  _notifyChange() {
    this.dispatchEvent(new CustomEvent("change", {
      detail: {
        models: this.models,
        iterations: this.iterations,
        concurrency: this.concurrency,
        instructionOverride: this.instructionOverride,
        answerGenerationMode: this.answerGenerationMode,
        assistSkippingMode: this.assistSkippingMode,
        searchResultMode: this.searchResultMode,
        apiTimeout: this.apiTimeout,
        scenarioTimeout: this.scenarioTimeout,
        runTimeout: this.runTimeout
      },
      bubbles: !0,
      composed: !0
    }));
  }
  render() {
    return p`
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 800px; margin: 0 auto 1rem auto;">
        
        <!-- Top Card: Model Settings -->
        <div class="card" style="margin-bottom: 0;">
          <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 0.75rem;">Model & Scale Settings</h2>
          
          <div style="margin-bottom: 0.75rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Benchmark Models:</label>
            <div style="display: flex; gap: 1.5rem; align-items: center;">
              <label style="font-size: 0.88rem; cursor: pointer; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                <md-checkbox id="config-model-flash" value="gemini-3.5-flash" ?checked="${this.models.includes("gemini-3.5-flash")}" @change="${(e) => this._onModelChange("gemini-3.5-flash", e)}"></md-checkbox>
                <span>gemini-3.5-flash</span>
              </label>
              <label style="font-size: 0.88rem; cursor: pointer; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                <md-checkbox id="config-model-pro" value="gemini-3.1-pro" ?checked="${this.models.includes("gemini-3.1-pro")}" @change="${(e) => this._onModelChange("gemini-3.1-pro", e)}"></md-checkbox>
                <span>gemini-3.1-pro</span>
              </label>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Iterations:</label>
              <md-outlined-select id="config-iterations-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onIterationsChange}">
                <md-select-option value="1" ?selected="${this.iterations === 1}"><div slot="headline">1 Iteration</div></md-select-option>
                <md-select-option value="2" ?selected="${this.iterations === 2}"><div slot="headline">2 Iterations</div></md-select-option>
                <md-select-option value="3" ?selected="${this.iterations === 3}"><div slot="headline">3 Iterations</div></md-select-option>
              </md-outlined-select>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Concurrency Limit:</label>
              <md-outlined-select id="config-concurrency-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onConcurrencyChange}">
                <md-select-option value="1" ?selected="${this.concurrency === 1}"><div slot="headline">1 Connection (Sequential)</div></md-select-option>
                <md-select-option value="5" ?selected="${this.concurrency === 5}"><div slot="headline">5 Connections</div></md-select-option>
                <md-select-option value="10" ?selected="${this.concurrency === 10}"><div slot="headline">10 Connections</div></md-select-option>
                <md-select-option value="25" ?selected="${this.concurrency === 25}"><div slot="headline">25 Connections (Default)</div></md-select-option>
                <md-select-option value="50" ?selected="${this.concurrency === 50}"><div slot="headline">50 Connections (Max Scale)</div></md-select-option>
              </md-outlined-select>
            </div>
          </div>
        </div>

        <!-- NEW Card: StreamAssist Engine Controls -->
        <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin: 0;">StreamAssist Engine & Retrieval Tuning</h2>
            <span style="font-size: 0.75rem; background: rgba(99, 102, 241, 0.1); color: var(--accent-primary); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">Discovery Engine v1alpha</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Answer Generation Mode:</label>
              <md-outlined-select id="config-answer-mode-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onAnswerModeChange}">
                <md-select-option value="NORMAL" ?selected="${this.answerGenerationMode === "NORMAL"}"><div slot="headline">NORMAL (Fast Grounded RAG - Recommended)</div></md-select-option>
                <md-select-option value="AGENT" ?selected="${this.answerGenerationMode === "AGENT"}"><div slot="headline">AGENT (Autonomous Low-Code Agent)</div></md-select-option>
              </md-outlined-select>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Assist Skipping Mode:</label>
              <md-outlined-select id="config-assist-skipping-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onAssistSkippingChange}">
                <md-select-option value="REQUEST_ASSIST" ?selected="${this.assistSkippingMode === "REQUEST_ASSIST"}"><div slot="headline">REQUEST_ASSIST (Guaranteed Generative AI)</div></md-select-option>
                <md-select-option value="AUTO" ?selected="${this.assistSkippingMode === "AUTO"}"><div slot="headline">AUTO (Classifier Gated)</div></md-select-option>
                <md-select-option value="SKIP_ASSIST" ?selected="${this.assistSkippingMode === "SKIP_ASSIST"}"><div slot="headline">SKIP_ASSIST (Raw Search Snippets Only)</div></md-select-option>
              </md-outlined-select>
            </div>
          </div>
        </div>

        <!-- Card: Agent Prompt Parameters -->
        <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column;">
          <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 0.75rem;">Agent Prompt Parameters</h2>
          
          <div style="margin-bottom: 0.75rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Target Agent config ID:</label>
            <md-outlined-select id="config-agent-select" style="width: 100%; --md-outlined-select-container-shape: 8px;">
              <md-select-option value="core_assistant" selected><div slot="headline">core_assistant (Enterprise Search)</div></md-select-option>
            </md-outlined-select>
          </div>

          <div style="display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); text-transform: uppercase;">Custom System Prompt Override:</label>
              <div style="display: flex; gap: 0.4rem;">
                <button type="button" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; height: auto;" @click="${() => this._applyPromptPreset("yahoo_concise")}">⚡ Yahoo Standard</button>
                <button type="button" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; height: auto;" @click="${() => this._applyPromptPreset("technical")}">📋 Technical</button>
                <button type="button" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; height: auto;" @click="${() => this._applyPromptPreset("clear")}">🧹 Clear</button>
              </div>
            </div>
            <textarea
              id="config-instruction-override"
              rows="3"
              .value="${this.instructionOverride}"
              placeholder="Leave empty to use the agent's default system instructions, or click a preset above..."
              @input="${this._onInstructionOverrideChange}"
              style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s; resize: vertical;"
              onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
              onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
            ></textarea>
          </div>
        </div>

        <!-- Card: Timeout & Reliability Settings -->
        <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column;">
          <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 0.75rem;">Timeout & Reliability Settings</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">API Request Timeout:</label>
              <md-outlined-select id="config-api-timeout-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onApiTimeoutChange}">
                <md-select-option value="30" ?selected="${this.apiTimeout === 30}"><div slot="headline">30s (Fast)</div></md-select-option>
                <md-select-option value="60" ?selected="${this.apiTimeout === 60}"><div slot="headline">60s (Default)</div></md-select-option>
                <md-select-option value="90" ?selected="${this.apiTimeout === 90}"><div slot="headline">90s (Relaxed)</div></md-select-option>
                <md-select-option value="120" ?selected="${this.apiTimeout === 120}"><div slot="headline">120s (Extended)</div></md-select-option>
              </md-outlined-select>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Scenario Timeout:</label>
              <md-outlined-select id="config-scenario-timeout-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onScenarioTimeoutChange}">
                <md-select-option value="60" ?selected="${this.scenarioTimeout === 60}"><div slot="headline">60s (Quick)</div></md-select-option>
                <md-select-option value="90" ?selected="${this.scenarioTimeout === 90}"><div slot="headline">90s (Relaxed)</div></md-select-option>
                <md-select-option value="120" ?selected="${this.scenarioTimeout === 120}"><div slot="headline">120s (Default)</div></md-select-option>
                <md-select-option value="300" ?selected="${this.scenarioTimeout === 300}"><div slot="headline">5m (Max)</div></md-select-option>
              </md-outlined-select>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Overall Run Timeout:</label>
              <md-outlined-select id="config-run-timeout-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onRunTimeoutChange}">
                <md-select-option value="300" ?selected="${this.runTimeout === 300}"><div slot="headline">5m (Fast Run)</div></md-select-option>
                <md-select-option value="600" ?selected="${this.runTimeout === 600}"><div slot="headline">10m (Default)</div></md-select-option>
                <md-select-option value="1200" ?selected="${this.runTimeout === 1200}"><div slot="headline">20m (Long Run)</div></md-select-option>
                <md-select-option value="1800" ?selected="${this.runTimeout === 1800}"><div slot="headline">30m (Max)</div></md-select-option>
              </md-outlined-select>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
ye(Ii, "properties", {
  models: { type: Array },
  iterations: { type: Number },
  concurrency: { type: Number },
  instructionOverride: { type: String },
  answerGenerationMode: { type: String },
  assistSkippingMode: { type: String },
  searchResultMode: { type: String },
  apiTimeout: { type: Number },
  scenarioTimeout: { type: Number },
  runTimeout: { type: Number }
});
customElements.define("run-config-panel", Ii);
class Ri extends I {
  constructor() {
    super(), this.runId = "", this.runStatus = "running", this.isMonitoring = !0, this.events = [], this.runConfig = null, this.latencySummary = null, this.helpOpen = {};
  }
  createRenderRoot() {
    return this;
  }
  async _handleCancelRun(e) {
    if (e && e.preventDefault) e.preventDefault();
    const runId = this.runId || window.currentActiveMonitorRunId;
    if (!runId) return;
    if (typeof window.cancelRun === "function") {
      await window.cancelRun(runId);
      this.runStatus = "cancelled";
      this.isMonitoring = !1;
      this.requestUpdate();
    }
  }
  openHelpModal(e) {
    typeof window.openHelpModal == "function" && window.openHelpModal(e);
  }
  renderHelpButton(e) {
    return p`
      <button class="btn btn-secondary btn-sm" 
              @click="${() => this.openHelpModal(e)}" 
              title="Click to learn more about this panel"
              style="padding: 0.15rem 0.45rem; font-size: 0.72rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 0.25rem; background: var(--bg-card-secondary); color: var(--text-sub); border: 1px solid var(--border-color); cursor: pointer; font-weight: 500;">
        <span>ℹ️</span>
        <span>Info</span>
      </button>
    `;
  }
  _handleViewDataset(e, t, i) {
    e.preventDefault(), typeof window.viewDatasetReadOnly == "function" ? window.viewDatasetReadOnly(t, i, "run-status") : window.location.hash = `dataset-viewer?id=${encodeURIComponent(t)}&type=${encodeURIComponent(i)}&from=run-status`;
  }
  render() {
    var P, k, W, K, H, Y, ce, X, ie, $e, ge, be, V;
    const e = window.GCP_PROJECT_ID || "", t = window.GCP_ENGINE_ID || "", i = [
      { name: "Initialization", displayName: "Initialization", aliases: ["Init"] },
      { name: "REST API Benchmarks", displayName: "REST API Benchmarks" },
      { name: "LLM Judge Evaluation", displayName: "LLM Judge Evaluation" },
      { name: "AI Failure Diagnostics", displayName: "AI Failure Diagnostics" },
      { name: "Persistence", displayName: "Persistence" }
    ], r = {};
    i.forEach((h) => {
      r[h.name] = {
        status: "PENDING",
        time: "--:--:--",
        info: "Waiting to start..."
      };
    });
    let n = 0;
    this.events && this.events.length > 0 && this.events.forEach((h) => {
      const match = i.find(step => step.name === h.step || (step.aliases && step.aliases.includes(h.step)));
      const stepKey = match ? match.name : h.step;
      r[stepKey] && (r[stepKey] = {
        status: h.status.toUpperCase(),
        time: h.time || "",
        info: h.info || ""
      });
    }), i.forEach((h) => {
      r[h.name].status === "COMPLETED" && n++;
    });
    const S = (n >= i.length) || (r["Persistence"] && r["Persistence"].status === "COMPLETED");
    const s = S ? 100 : Math.min(100, Math.round(n / i.length * 100));
    S && this.runId && this.dispatchEvent(new CustomEvent("completed", { bubbles: !0, composed: !0 }));
    const l = ((P = this.runConfig) == null ? void 0 : P.models) || ["gemini-3.5-flash"];
    let d = l.length || 1, m = Number((k = this.runConfig) == null ? void 0 : k.iterations) || 1;
    const g = ((W = this.runConfig) == null ? void 0 : W.max_concurrent_calls) || 10;
    let u = Number((K = this.runConfig) == null ? void 0 : K.sample_count) || 0, v = Number((H = this.runConfig) == null ? void 0 : H.total_requests) || 0, y = 0;
    this.events && this.events.length > 0 && this.events.forEach((h) => {
      const f = h.info || "", E = f.match(/Dataset:\s+.*?\s+\((\d+)\s+queries\)/i);
      E && (!u || u === 0) && (u = parseInt(E[1], 10));
      const w = f.match(/(\d+)\s+(?:queries|samples)\s+×\s+(\d+)\s+models(?:\s+.*?)?(?:×\s+(\d+)\s+iter(?:ations)?)?\s*=\s*(\d+)\s+total\s+(?:calls|requests|API\s+requests)/i);
      w && ((!u || u === 0) && (u = parseInt(w[1], 10)), w[2] && (d = parseInt(w[2], 10)), w[3] && (m = parseInt(w[3], 10)), (!v || v === 0) && (v = parseInt(w[4], 10)));
      const N = f.match(/(\d+)\s+(?:samples|queries)\s+×\s+(\d+)\s+models/i);
      N && (!u || u === 0) && (u = parseInt(N[1], 10));
      const oe = f.match(/Expanded configuration into (\d+) query rows/i);
      oe && (!u || u === 0) && (u = parseInt(oe[1], 10));
      const U = f.match(/Graded\s+(\d+)\s+(?:GE\s+)?outputs/i);
      U && (!v || v === 0) && (v = parseInt(U[1], 10));
      const ue = f.match(/(\d+)\s+total\s+(?:calls|API\s+requests|requests)/i) || f.match(/Executing\s+(\d+)\s+(?:concurrent\s+)?(?:streamAssist\s+REST\s+calls|API\/UI\s+requests|API\s+requests|requests|calls)/i);
      ue && (!v || v === 0) && (v = parseInt(ue[1], 10));
      const De = f.match(/Progress:\s*(\d+)\/(\d+)\s+(?:completed|requests|calls)/i);
      De && (y = parseInt(De[1], 10), (!v || v === 0) && (v = parseInt(De[2], 10)));
    }), u === 0 && v > 0 && d > 0 && m > 0 && (u = Math.max(1, Math.round(v / (d * m)))), v === 0 && u > 0 && (v = u * d * m), ((((Y = r["REST API Benchmarks"]) == null ? void 0 : Y.status) || "PENDING") === "COMPLETED" || n === 4) && v > 0 && (y = v);
    const A = v > 0 ? Math.min(100, Math.round(y / v * 100)) : 0;
    let _ = ((ce = this.latencySummary) == null ? void 0 : ce.eval_api_ttlt) || ((X = this.latencySummary) == null ? void 0 : X.ttlt_sec) || null, x = ((ie = this.latencySummary) == null ? void 0 : ie.llm_judge_ttlt) || (($e = this.latencySummary) == null ? void 0 : $e.judge_ttlt_sec) || null;
    if (!_ || !_.p50) {
      const h = (this.events || []).find((f) => (f.step || "").toLowerCase().includes("rest") && (f.info || "").includes("p50="));
      if (h && h.info) {
        const f = h.info.match(/p50=([\d\.]+)s/), E = h.info.match(/p95=([\d\.]+)s/), w = h.info.match(/max=([\d\.]+)s/), N = h.info.match(/Avg ([\d\.]+)s/);
        f && (_ = {
          p50: parseFloat(f[1]),
          p95: parseFloat(E ? E[1] : f[1]),
          max: parseFloat(w ? w[1] : f[1]),
          avg: parseFloat(N ? N[1] : f[1]),
          min: parseFloat(f[1])
        });
      }
    }
    if (!x || !x.p50) {
      const h = (this.events || []).find((f) => (f.step || "").toLowerCase().includes("judge") && (f.info || "").includes("p50="));
      if (h && h.info) {
        const f = h.info.match(/p50=([\d\.]+)s/), E = h.info.match(/p95=([\d\.]+)s/), w = h.info.match(/max=([\d\.]+)s/);
        f && (x = {
          p50: parseFloat(f[1]),
          p95: parseFloat(E ? E[1] : f[1]),
          max: parseFloat(w ? w[1] : f[1]),
          avg: parseFloat(f[1]),
          min: parseFloat(f[1])
        });
      }
    }
    const $ = !!((ge = this.runConfig) != null && ge.custom_system_instruction || (be = this.runConfig) != null && be.instruction_sets && this.runConfig.instruction_sets.includes("Custom") || ((V = this.runConfig) == null ? void 0 : V.system_instruction_mode) === "Custom"), D = $ ? "Custom" : "Default";
    return p`
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <h2 id="status-title-id" style="font-family: var(--font-display); font-size: 1.15rem; margin: 0;">Step-by-Step Progress Pipeline</h2>
              ${$ ? p`
                <span class="badge badge-pass" style="font-size: 0.72rem; padding: 0.15rem 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <span>⚙️</span>
                  <span>Custom Instructions</span>
                </span>
              ` : ""}
            </div>
            <div id="status-info-banner" style="font-size: 0.84rem; color: var(--text-sub); margin-top: 0.2rem;">
              ${this.runId ? `Live monitoring active for run ${this.runId}` : "Select a run or launch a new matrix evaluation session to monitor step logs here."}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            ${this.renderHelpButton("pipeline")}
            ${this.runId && (this.runStatus === "running" || this.isMonitoring) ? p`
              <button 
                class="btn btn-outline" 
                style="color: var(--danger-color, #d93025); border: 1px solid var(--danger-color, #d93025); background: rgba(217, 48, 37, 0.08); font-size: 0.8rem; padding: 0.32rem 0.75rem; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; transition: all 0.2s;"
                @click="${this._handleCancelRun}"
                title="Immediately cancel this running evaluation"
              >
                <span>🛑</span>
                <span>Cancel Run</span>
              </button>
            ` : ""}
            <div id="status-progress-bar-container" style="width: 200px; background: var(--bg-card-secondary); height: 10px; border-radius: 5px; border: 1px solid var(--border-color); position: relative; overflow: hidden; display: ${this.runId ? "block" : "none"};">
              <div id="status-progress-fill" style="background: var(--accent-primary); width: ${s}%; height: 100%; transition: width 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <!-- Concurrency & Matrix Calculation Insight Card -->
        ${this.runId ? p`
          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.75rem 1.15rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(60,64,67,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.5rem;">
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.6px; color: var(--accent-primary); font-weight: 700; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.2rem;">
                  <span>🧮</span>
                  <span>Batch Matrix Calculation Formula</span>
                </div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); font-family: var(--font-display); display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem;">
                  <span style="color: var(--accent-primary); background: var(--bg-card-secondary); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                    ${u || 1} Samples
                  </span>
                  <span style="color: var(--text-sub); font-size: 0.85rem;">×</span>
                  <span style="color: var(--success-color); background: var(--bg-card-secondary); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                    ${d} Models (${l.map((h) => h.replace("gemini-", "")).join(", ")})
                  </span>
                  ${$ ? p`
                    <span style="color: var(--text-sub); font-size: 0.85rem;">×</span>
                    <span style="color: var(--accent-primary); background: var(--bg-card-secondary); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                      Custom Instructions
                    </span>
                  ` : ""}
                  ${m > 1 ? p`
                    <span style="color: var(--text-sub); font-size: 0.85rem;">×</span>
                    <span style="color: var(--accent-primary); background: var(--bg-card-secondary); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                      ${m} Iter
                    </span>
                  ` : ""}
                  <span style="color: var(--text-sub); font-size: 0.85rem;">=</span>
                  <span style="color: var(--accent-primary); background: var(--bg-card-secondary); padding: 0.15rem 0.6rem; border-radius: 4px; border: 1px solid var(--border-color); font-weight: 800; font-size: 0.85rem;">
                    ${v || (u || 1) * d * m} Total API Requests
                  </span>
                </div>
              </div>

              <!-- Concurrency Cap & Progress Callout + Info Button -->
              <div style="display: flex; gap: 0.65rem; align-items: center;">
                <div style="text-align: right; background: var(--bg-card-secondary); padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">
                  <div style="font-size: 0.64rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px;">Concurrency Pool</div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${g} Connections</div>
                </div>
                <div style="text-align: right; background: var(--bg-card-secondary); padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">
                  <div style="font-size: 0.64rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px;">Request Progress</div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: ${y === v && v > 0 ? "var(--success-color)" : "var(--accent-primary)"};">
                    ${y} / ${v || (u || 1) * d * m} (${A}%)
                  </div>
                </div>
                ${this.renderHelpButton("matrix")}
              </div>
            </div>

            <!-- Mini Request Progress Bar -->
            <div style="width: 100%; background: var(--bg-card-secondary); height: 6px; border-radius: 3px; border: 1px solid var(--border-color); overflow: hidden;">
              <div style="background: linear-gradient(90deg, var(--accent-primary) 0%, var(--success-color) 100%); width: ${A}%; height: 100%; transition: width 0.4s ease;"></div>
            </div>
          </div>
        ` : ""}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
          <span style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-sub); letter-spacing: 0.5px;">Phase Execution Logs</span>
          ${this.renderHelpButton("steps")}
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Step Name</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 15%;">Time</th>
                <th style="width: 55%;">Detail Summary / Provenance logs</th>
              </tr>
            </thead>
            <tbody id="run-status-body">
              ${this.runId ? i.map((h) => {
      const f = r[h.name], E = f.status;
      let w = "badge-pass";
      return E === "PENDING" ? w = "badge-secondary" : E === "RUNNING" ? w = "badge-glean" : (E.includes("FAILED") || E.includes("ERROR")) && (w = "badge-fail"), p`
                  <tr>
                    <td><b>${h.displayName}</b></td>
                    <td><span class="badge ${w}">${E}</span></td>
                    <td><code style="font-size: 0.78rem; color: var(--text-sub);">${f.time}</code></td>
                    <td><div style="font-size: 0.82rem; color: var(--text-main);">${f.info}</div></td>
                  </tr>
                `;
    }) : p`
                <tr><td colspan="4" style="text-align: center; color: var(--text-sub); padding: 1.25rem;">Select a run or launch a new matrix evaluation session to monitor step logs here.</td></tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- Completion Call-to-Action Banner -->
        ${S && this.runId ? p`
          <div style="margin-top: 1rem; background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.75rem 1.15rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(60,64,67,0.08);">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.35rem;">🎉</span>
              <div>
                <strong style="color: var(--success-color); font-size: 0.92rem; display: block; margin-bottom: 0.15rem;">Evaluation Run Complete!</strong>
                <div style="color: var(--text-sub); font-size: 0.8rem;">All benchmark matrix queries, latencies, and LLM judge evaluations have been recorded.</div>
              </div>
            </div>
            <button class="btn btn-primary" onclick="viewHistoricalRunResults('${this.runId}')" style="background: var(--accent-primary); color: #fff; font-weight: 600; padding: 0.4rem 1rem; border-radius: 18px; cursor: pointer; border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 0.84rem; display: inline-flex; align-items: center; gap: 0.35rem;">
              <span>📊</span>
              <span>View Results</span>
              <span>➡️</span>
            </button>
          </div>
        ` : ""}

        <!-- TTLT Latency Benchmarks Card -->
        ${this.runId ? p`
          <div style="margin-top: 1.15rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.15rem; box-shadow: 0 1px 3px rgba(60,64,67,0.06);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <h3 style="font-family: var(--font-display); font-size: 0.95rem; margin: 0; color: var(--text-main); display: flex; align-items: center; gap: 0.45rem; text-transform: uppercase; letter-spacing: 0.5px;">
                  <span>⏱️</span>
                  <span>Latency Benchmarks (Total Time To Last Token - TTLT)</span>
                </h3>
                <div style="font-size: 0.76rem; color: var(--text-sub); margin-top: 0.15rem;">
                  Statistical percentile distribution (p50, p95, and Max) across eval API calls and LLM-as-a-Judge evaluations.
                </div>
              </div>
              <div>
                ${this.renderHelpButton("latency")}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.85rem;">
              
              <!-- Box 1: Eval API Calls (streamAssist TTLT) -->
              <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                  <div style="font-weight: 700; font-size: 0.84rem; color: var(--accent-primary); display: flex; align-items: center; gap: 0.35rem;">
                    <span>⚡</span>
                    <span>Eval API Calls (streamAssist TTLT)</span>
                  </div>
                  <span class="badge badge-pass" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;">streamAssist</span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.45rem; text-align: center;">
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">p50 (Median)</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="eval-api-ttlt-p50">
                      ${_ && _.p50 !== void 0 && _.p50 > 0 ? `${_.p50.toFixed(2)}s` : "--"}
                    </div>
                  </div>
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">p95</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="eval-api-ttlt-p95">
                      ${_ && _.p95 !== void 0 && _.p95 > 0 ? `${_.p95.toFixed(2)}s` : "--"}
                    </div>
                  </div>
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Max</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="eval-api-ttlt-max">
                      ${_ && _.max !== void 0 && _.max > 0 ? `${_.max.toFixed(2)}s` : "--"}
                    </div>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-sub); margin-top: 0.45rem; padding: 0 0.2rem;">
                  <span>Min: <b style="color: var(--text-main); font-family: monospace;">${_ && _.min !== void 0 && _.min > 0 ? `${_.min.toFixed(2)}s` : "--"}</b></span>
                  <span>Avg: <b style="color: var(--text-main); font-family: monospace;">${_ && _.avg !== void 0 && _.avg > 0 ? `${_.avg.toFixed(2)}s` : "--"}</b></span>
                </div>
              </div>

              <!-- Box 2: LLM Judge Evaluation (Gemini 3.1 Pro TTLT) -->
              <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                  <div style="font-weight: 700; font-size: 0.84rem; color: var(--accent-primary); display: flex; align-items: center; gap: 0.35rem;">
                    <span>⚖️</span>
                    <span>LLM Judge Evaluation TTLT</span>
                  </div>
                  <span class="badge" style="background: var(--bg-card); color: var(--accent-primary); border: 1px solid var(--border-color); font-size: 0.68rem; padding: 0.15rem 0.45rem;">Gemini 3.1 Pro</span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.45rem; text-align: center;">
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">p50 (Median)</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="judge-ttlt-p50">
                      ${x && x.p50 !== void 0 && x.p50 > 0 ? `${x.p50.toFixed(2)}s` : "--"}
                    </div>
                  </div>
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">p95</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="judge-ttlt-p95">
                      ${x && x.p95 !== void 0 && x.p95 > 0 ? `${x.p95.toFixed(2)}s` : "--"}
                    </div>
                  </div>
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Max</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="judge-ttlt-max">
                      ${x && x.max !== void 0 && x.max > 0 ? `${x.max.toFixed(2)}s` : "--"}
                    </div>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-sub); margin-top: 0.45rem; padding: 0 0.2rem;">
                  <span>Min: <b style="color: var(--text-main); font-family: monospace;">${x && x.min !== void 0 && x.min > 0 ? `${x.min.toFixed(2)}s` : "--"}</b></span>
                  <span>Avg: <b style="color: var(--text-main); font-family: monospace;">${x && x.avg !== void 0 && x.avg > 0 ? `${x.avg.toFixed(2)}s` : "--"}</b></span>
                </div>
              </div>

            </div>
          </div>
        ` : ""}

        <!-- HTTP API Dispatch Telemetry & Resilient Retry Breakdown Card -->
        ${this.runId ? p`
          ${(() => {
      var Nt;
      const h = ((Nt = this.latencySummary) == null ? void 0 : Nt.http_status_summary) || null, f = (h == null ? void 0 : h.status_code_breakdown) || { 200: y || v || 0 }, E = (h == null ? void 0 : h.total_dispatched_calls) || y || v || 0, w = (h == null ? void 0 : h.retried_scenarios_count) || 0, N = (h == null ? void 0 : h.total_retries_count) || 0, oe = (h == null ? void 0 : h.successful_calls_count) !== void 0 ? h.successful_calls_count : f[200] || 0, U = v || (u || 1) * d * m, ue = U > 0 ? Math.min(100, Math.round(oe / U * 100)) : 100, Oi = [
        { code: "200", name: "HTTP 200 OK", desc: "Successful streamAssist synthesis & token delivery", badge: "badge-pass", recovery: "Direct Success" },
        { code: "429", name: "HTTP 429 Rate Limit", desc: "Discovery Engine quota throttle / burst concurrency delay", badge: "badge-glean", recovery: "Auto-recovered via exponential backoff & jitter" },
        { code: "503", name: "HTTP 503 Unavailable", desc: "Transient backend model / connector gateway unavailable", badge: "badge-glean", recovery: "Auto-recovered via fresh session retry" },
        { code: "408", name: "HTTP 408 Timeout", desc: "Per-attempt execution exceeded dynamic timeout allocation", badge: "badge-secondary", recovery: "Reprovisioned fresh user session" },
        { code: "500", name: "HTTP 500 Server Error", desc: "Internal backend service execution exception", badge: "badge-fail", recovery: "Attempted retry" },
        { code: "400", name: "HTTP 400 Bad Request", desc: "Invalid payload parameter or malformed request schema", badge: "badge-fail", recovery: "Fail-fast (Non-retryable)" },
        { code: "403", name: "HTTP 403 Forbidden", desc: "Insufficient IAM permission or authentication scope expired", badge: "badge-fail", recovery: "Fail-fast (Non-retryable)" }
      ].filter((ee) => f[ee.code] !== void 0 && f[ee.code] > 0 || ["200", "429", "503", "408"].includes(ee.code));
      return p`
              <div style="margin-top: 1.15rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.15rem; box-shadow: 0 1px 3px rgba(60,64,67,0.06);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div>
                    <h3 style="font-family: var(--font-display); font-size: 0.95rem; margin: 0; color: var(--text-main); display: flex; align-items: center; gap: 0.45rem; text-transform: uppercase; letter-spacing: 0.5px;">
                      <span>📡</span>
                      <span>HTTP API Dispatch Telemetry & Resilient Retry Breakdown</span>
                    </h3>
                    <div style="font-size: 0.76rem; color: var(--text-sub); margin-top: 0.15rem;">
                      Real-time HTTPS response status distribution, retry tracking, and connection recovery statistics.
                    </div>
                  </div>
                  <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <span class="badge ${w === 0 ? "badge-pass" : "badge-glean"}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                      <span>🔄</span>
                      <span>${w > 0 ? `${w} Scenarios Retried (${N} total retries)` : "Zero Retries (100% First-Pass)"}</span>
                    </span>
                    <span class="badge ${ue >= 95 ? "badge-pass" : "badge-fail"}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem;">
                      ${oe}/${U} Successful (${ue}%)
                    </span>
                    ${this.renderHelpButton("http")}
                  </div>
                </div>

                <!-- KPI Metric Strip -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.65rem; margin-bottom: 0.85rem;">
                  <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.75rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Total Dispatched Calls</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); font-family: monospace; margin-top: 0.2rem;">${E}</div>
                    <div style="font-size: 0.68rem; color: var(--text-sub); margin-top: 0.15rem;">Base + retry attempts</div>
                  </div>
                  <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.75rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">HTTP 200 OK Delivered</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: var(--success-color); font-family: monospace; margin-top: 0.2rem;">${f[200] || 0}</div>
                    <div style="font-size: 0.68rem; color: var(--text-sub); margin-top: 0.15rem;">Complete token streams</div>
                  </div>
                  <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.75rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Retried Scenarios</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: ${w > 0 ? "var(--accent-primary)" : "var(--text-sub)"}; font-family: monospace; margin-top: 0.2rem;">${w}</div>
                    <div style="font-size: 0.68rem; color: var(--text-sub); margin-top: 0.15rem;">${N} total retry attempts</div>
                  </div>
                  <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.75rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Transient Delays/Timeouts</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: ${(f[408] || 0) + (f[429] || 0) + (f[503] || 0) > 0 ? "var(--warning-color, #f9ab00)" : "var(--text-sub)"}; font-family: monospace; margin-top: 0.2rem;">
                      ${(f[408] || 0) + (f[429] || 0) + (f[503] || 0)}
                    </div>
                    <div style="font-size: 0.68rem; color: var(--text-sub); margin-top: 0.15rem;">HTTP 408 / 429 / 503</div>
                  </div>
                </div>

                <!-- Detailed HTTP Response Codes Table -->
                <div class="table-container">
                  <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
                    <thead>
                      <tr style="color: var(--text-sub); border-bottom: 1px solid var(--border-color); text-align: left;">
                        <th style="padding: 0.35rem 0.6rem; width: 22%;">HTTP Response Status</th>
                        <th style="padding: 0.35rem 0.6rem; width: 40%;">Description & API Behavior</th>
                        <th style="padding: 0.35rem 0.6rem; width: 14%; text-align: center;">Attempt Count</th>
                        <th style="padding: 0.35rem 0.6rem; width: 24%;">Harness Recovery Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Oi.map((ee) => {
        const Ne = f[ee.code] || 0, zi = E > 0 ? (Ne / E * 100).toFixed(1) : "0.0";
        return p`
                          <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.4rem 0.6rem; vertical-align: middle;">
                              <span class="badge ${ee.badge}" style="font-size: 0.72rem; padding: 0.15rem 0.45rem; font-weight: 700;">${ee.name}</span>
                            </td>
                            <td style="padding: 0.4rem 0.6rem; vertical-align: middle; color: var(--text-main); font-size: 0.78rem;">
                              ${ee.desc}
                            </td>
                            <td style="padding: 0.4rem 0.6rem; vertical-align: middle; text-align: center;">
                              <code style="font-weight: 700; font-size: 0.82rem; color: ${Ne > 0 ? "var(--text-main)" : "var(--text-sub)"};">${Ne}</code>
                              <span style="font-size: 0.7rem; color: var(--text-sub); margin-left: 0.25rem;">(${zi}%)</span>
                            </td>
                            <td style="padding: 0.4rem 0.6rem; vertical-align: middle; font-size: 0.74rem; color: ${Ne > 0 && ee.code !== "200" ? "var(--accent-primary)" : "var(--text-sub)"};">
                              ${ee.recovery}
                            </td>
                          </tr>
                        `;
      })}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
    })()}
        ` : ""}

        <!-- Section: Low-Level Logs & Diagnostic Console -->
        ${this.runId ? p`
          <div style="margin-top: 1.25rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.15rem; box-shadow: 0 1px 3px rgba(60,64,67,0.06);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.1rem;">📜</span>
                <h3 style="font-family: var(--font-display); font-size: 0.95rem; margin: 0; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">
                  Low-Level Logs & Diagnostic Output
                </h3>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${this.renderHelpButton("logs")}
                <button class="btn btn-secondary btn-sm" @click="${this._copyLogs}" style="font-size: 0.75rem; padding: 0.25rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <span>📋</span>
                  <span>Copy</span>
                </button>
                <button class="btn btn-secondary btn-sm" @click="${this._downloadLogs}" style="font-size: 0.75rem; padding: 0.25rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <span>💾</span>
                  <span>Export</span>
                </button>
              </div>
            </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button class="btn btn-secondary btn-sm" 
                        @click="${() => {
      const h = (this.events || []).map((f) => `[${f.time || "--:--:--"}] [${f.step || "General"}] [${f.status || "INFO"}] ${f.info || ""}`).join(`
`);
      navigator.clipboard.writeText(h), typeof window.showToast == "function" ? window.showToast("Copied diagnostic logs to clipboard!", "success") : alert("Diagnostic logs copied to clipboard!");
    }}"
                        style="padding: 0.2rem 0.55rem; font-size: 0.74rem; background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-main); cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem;">
                  <span>📋</span>
                  <span>Copy Raw Logs</span>
                </button>
              </div>
            </div>

            <!-- Auth / Remediation Command Banner if ADC error detected -->
            ${(this.events || []).some((f) => {
      const E = String(f.status || "").toUpperCase(), w = String(f.info || "");
      return (E.includes("FAIL") || E.includes("ERR") || w.toLowerCase().includes("error") || w.toLowerCase().includes("failed") || w.toLowerCase().includes("unauthenticated")) && (w.includes("application-default login") || w.toLowerCase().includes("reauthentication") || w.toLowerCase().includes("adc authentication error") || w.toLowerCase().includes("credentials are missing") || w.toLowerCase().includes("credentials have expired") || w.toLowerCase().includes("unauthenticated") || w.toLowerCase().includes("could not automatically determine credentials"));
    }) ? p`
                  <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.2rem;">🔑</span>
                        <div>
                          <strong style="color: #fca5a5; font-size: 0.85rem;">GCP ADC Authentication Required</strong>
                          <div style="color: #fecaca; font-size: 0.78rem;">Your Application Default Credentials have expired or are missing. Run this command in your terminal:</div>
                        </div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 0.4rem; background: var(--bg-card); padding: 0.35rem 0.7rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <code style="font-family: monospace; font-size: 0.8rem; color: var(--danger-color);">gcloud auth application-default login</code>
                        <button class="btn btn-secondary btn-sm" 
                                @click="${() => {
      navigator.clipboard.writeText("gcloud auth application-default login"), typeof window.showToast == "function" ? window.showToast("Copied auth command to clipboard!", "success") : alert("Copied auth command!");
    }}"
                                style="padding: 0.1rem 0.4rem; font-size: 0.7rem; background: rgba(255,255,255,0.15); color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                          📋 Copy
                        </button>
                      </div>
                    </div>
                  </div>
                ` : ""}

            <!-- Terminal-styled Log Console Box -->
            <div id="low-level-logs-console" style="background: var(--code-bg, var(--bg-card-secondary)); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem 1rem; max-height: 250px; overflow-y: auto; font-family: 'JetBrains Mono', 'Roboto Mono', 'Fira Code', monospace; font-size: 0.78rem; line-height: 1.5; color: var(--text-main);">
              ${!this.events || this.events.length === 0 ? p`
                <div style="color: var(--text-sub); font-style: italic;">No events logged yet. Waiting for runner output...</div>
              ` : this.events.map((h) => {
      const f = h.step || "System", E = String(h.status || "INFO").toUpperCase(), w = E.includes("FAIL") || E.includes("ERR") || h.info && (h.info.includes("Error") || h.info.includes("Exception") || h.info.includes("Traceback")), N = E.includes("COMPLETED") || E.includes("DONE") || E.includes("PASS"), oe = E.includes("WARN") || E.includes("RETRY");
      let U = "var(--accent-primary)";
      return w ? U = "var(--danger-color)" : N ? U = "var(--success-color)" : oe && (U = "#d97706"), p`
                  <div style="margin-bottom: 0.25rem; display: flex; gap: 0.6rem; align-items: flex-start; word-break: break-word;">
                    <span style="color: var(--text-sub); flex-shrink: 0; user-select: none;">[${h.time || "--:--:--"}]</span>
                    <span style="color: var(--accent-secondary); flex-shrink: 0; font-weight: 600;">[${f}]</span>
                    <span style="color: ${U}; font-weight: 700; flex-shrink: 0;">[${E}]</span>
                    <span style="color: ${w ? "var(--danger-color)" : "var(--text-main)"}; flex: 1;">${h.info || ""}</span>
                  </div>
                `;
    })}
            </div>
          </div>
        ` : ""}

        <!-- Configuration Parameters Table -->
        ${this.runConfig && Object.keys(this.runConfig).length > 0 ? p`
          <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
              <h3 style="font-family: var(--font-display); font-size: 0.95rem; margin: 0; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">Run Configuration parameters</h3>
              ${this.renderHelpButton("config")}
            </div>

            <div class="table-container">
              <table style="width: 100%; font-size: 0.82rem;">
                <thead>
                  <tr style="color: var(--text-sub); border-bottom: 1px solid var(--border-color);">
                    <th style="width: 30%; padding: 0.35rem 0.6rem;">Parameter Setting</th>
                    <th style="width: 70%; padding: 0.35rem 0.6rem;">Configured Execution Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem;"><b>Evaluation Dataset</b></td>
                    <td style="padding: 0.35rem 0.6rem;">
                      ${(() => {
      const h = this.runConfig.dataset_key || this.runConfig.dataset_name || this.runConfig.dataset_id || "", f = h && h !== "custom_uploaded" && h !== "custom", E = f ? h : this.runId || "current", w = f ? "canonical" : "run";
      f || this.runId && `${this.runId}`;
      const N = f ? "badge-pass" : "badge-secondary", oe = f ? "Canonical Dataset" : "Frozen Run Snapshot", U = this.runId || E;
      return p`
                          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="btn btn-secondary btn-sm" 
                                    id="btn-view-status-dataset"
                                    @click="${(ue) => this._handleViewDataset(ue, E, w)}" 
                                    style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; font-size: 0.78rem; background: var(--bg-card-secondary); color: var(--accent-primary); border: 1px solid var(--border-color); font-weight: 600; border-radius: 6px; cursor: pointer;">
                              <span>📄</span>
                              <span>View Dataset (Run ID: ${U})</span>
                              <span style="font-size: 0.72rem;">↗</span>
                            </button>
                            <span class="badge ${N}" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${oe}</span>
                          </div>
                        `;
    })()}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem;"><b>Benchmark Models</b></td>
                    <td style="padding: 0.35rem 0.6rem;">
                      ${(this.runConfig.models || []).map((h) => p`<span class="badge badge-pass" style="margin-right: 0.35rem; font-size: 0.72rem; padding: 0.15rem 0.45rem;">${h}</span>`)}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem; vertical-align: top;"><b>Active Data Connectors</b></td>
                    <td style="padding: 0.35rem 0.6rem;">
                      ${(() => {
      const h = this.runConfig.active_connectors && this.runConfig.active_connectors.length > 0 ? this.runConfig.active_connectors : this.runConfig.connectors || [];
      return !h || h.length === 0 || h.length === 1 && h[0] === "none" ? p`<span style="color: var(--text-sub); font-style: italic;">None (RAG Disabled)</span>` : p`
                          <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; margin-top: 0.15rem; text-align: left;">
                            <thead>
                              <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-sub);">
                                <th style="padding: 0.2rem 0.4rem; width: 75%;">CONNECTOR ID</th>
                                <th style="padding: 0.2rem 0.4rem; width: 25%; text-align: right;">CONSOLE LINK</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${h.map((f) => {
        const E = xi(f, t, e);
        return p`
                                  <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 0.2rem 0.4rem; vertical-align: middle;">
                                      <code style="font-size: 0.76rem; color: var(--code-text); background: var(--code-bg); padding: 0.1rem 0.3rem; border-radius: 4px;">${f}</code>
                                    </td>
                                    <td style="padding: 0.2rem 0.4rem; vertical-align: middle; text-align: right;">
                                      <a href="${E}" target="_blank" style="font-size: 0.72rem; color: var(--accent-primary); text-decoration: underline;">
                                        Console Page ↗
                                      </a>
                                    </td>
                                  </tr>
                                `;
      })}
                            </tbody>
                          </table>
                        `;
    })()}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem;"><b>Iterations count</b></td>
                    <td style="padding: 0.35rem 0.6rem;"><code style="font-size: 0.8rem; color: var(--code-text); background: var(--code-bg); padding: 0.1rem 0.35rem; border-radius: 4px;">${this.runConfig.iterations || 1}</code></td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem;"><b>Max Concurrent Connections</b></td>
                    <td style="padding: 0.35rem 0.6rem;"><code style="font-size: 0.8rem; color: var(--code-text); background: var(--code-bg); padding: 0.1rem 0.35rem; border-radius: 4px;">${this.runConfig.max_concurrent_calls || 3}</code></td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.45rem 0.6rem; vertical-align: top;">
                      <b>System Instructions Mode</b>
                      <div style="font-size: 0.72rem; color: var(--text-sub); margin-top: 0.15rem;">Configured agent directive prompt</div>
                    </td>
                    <td style="padding: 0.45rem 0.6rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: ${$ && this.runConfig.custom_system_instruction ? "0.45rem" : "0"};">
                        <span class="badge ${$ ? "badge-pass" : "badge-secondary"}" style="font-size: 0.72rem; padding: 0.15rem 0.5rem; font-weight: 700;">
                          ${D}
                        </span>
                        <span style="font-size: 0.78rem; color: var(--text-sub);">
                          ${$ ? "Custom system directive override applied to all queries" : "Default Gemini Enterprise core assistant instructions (No custom override)"}
                        </span>
                      </div>
                      ${$ && this.runConfig.custom_system_instruction ? p`
                        <div style="margin-top: 0.35rem;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.5px;">Active Instruction Directive</span>
                            <button class="btn btn-secondary btn-sm" 
                                    @click="${() => {
      navigator.clipboard.writeText(this.runConfig.custom_system_instruction), typeof window.showToast == "function" && window.showToast("Copied instruction to clipboard!", "success");
    }}"
                                    style="padding: 0.15rem 0.45rem; font-size: 0.68rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; color: var(--text-main); display: inline-flex; align-items: center; gap: 0.25rem;">
                              <span>📋</span>
                              <span>Copy Instruction</span>
                            </button>
                          </div>
                          <div style="font-family: monospace; white-space: pre-wrap; background: var(--bg-card-secondary); padding: 0.6rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); max-height: 140px; overflow-y: auto; color: var(--text-main); line-height: 1.4; font-size: 0.78rem; word-break: break-word;">${this.runConfig.custom_system_instruction}</div>
                        </div>
                      ` : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }
}
ye(Ri, "properties", {
  runId: { type: String },
  events: { type: Array },
  runConfig: { type: Object },
  latencySummary: { type: Object },
  helpOpen: { type: Object }
});
customElements.define("run-status-monitor", Ri);
console.log("⚡ Gemini Enterprise Eval Harness bundle active!");
//# sourceMappingURL=eval-harness-bundle.js.map
