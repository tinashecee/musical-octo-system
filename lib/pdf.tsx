import { Document as PdfRoot, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { formatDate, formatMoney, formatQty } from "./format";
import { present } from "./present";
import type { BusinessDocument, CompanyDetails } from "./types";

let fontsReady = false;

function ensureFonts() {
  if (fontsReady) return;
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const ink = "#1c241f";
const muted = "#5c665e";
const line = "#d9d3c7";
const moss = "#0e6b52";
const paper = "#fffdf8";

const styles = StyleSheet.create({
  classicPage: { paddingTop: 36, paddingHorizontal: 36, paddingBottom: 52, fontFamily: "Times-Roman", color: ink, fontSize: 10 },
  sansPage: { paddingTop: 32, paddingHorizontal: 32, paddingBottom: 52, fontFamily: "Helvetica", color: ink, fontSize: 9 },
  bleedPage: { paddingBottom: 48, fontFamily: "Helvetica", color: ink, fontSize: 9 },
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, fontSize: 8, color: muted },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
});

type ViewModel = ReturnType<typeof present>;

function money(view: ViewModel, amount: number) {
  return formatMoney(amount, view.currency);
}

function PdfItems({ view, headerBg, headerColor, zebra }: { view: ViewModel; headerBg: string; headerColor: string; zebra?: string }) {
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ ...styles.row, backgroundColor: headerBg, color: headerColor, paddingVertical: 6, paddingHorizontal: 6 }}>
        <Text style={{ flex: 1, fontFamily: "Helvetica-Bold", fontSize: 8 }}>Description</Text>
        {view.showSupplied ? (
          <>
            <Text style={{ width: 48, fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>Ordered</Text>
            <Text style={{ width: 52, fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>Supplied</Text>
          </>
        ) : (
          <Text style={{ width: 42, fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>Qty</Text>
        )}
        <Text style={{ width: 36, fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>Unit</Text>
        <Text style={{ width: 62, fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>Price</Text>
        {view.showDiscount ? <Text style={{ width: 40, fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>Disc</Text> : null}
        {view.showTax ? <Text style={{ width: 36, fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>VAT</Text> : null}
        <Text style={{ width: 70, fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "right" }}>Amount</Text>
      </View>
      {view.lines.map((item, index) => (
        <View key={item.id} style={{ ...styles.row, backgroundColor: zebra && index % 2 === 1 ? zebra : "transparent", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.4, borderBottomColor: line }}>
          <Text style={{ flex: 1 }}>{item.description || " "}</Text>
          {view.showSupplied ? (
            <>
              <Text style={{ width: 48, textAlign: "right" }}>{formatQty(item.quantity)}</Text>
              <Text style={{ width: 52, textAlign: "right" }}>{formatQty(item.supplied)}</Text>
            </>
          ) : (
            <Text style={{ width: 42, textAlign: "right" }}>{formatQty(item.supplied)}</Text>
          )}
          <Text style={{ width: 36, textAlign: "right" }}>{item.unit}</Text>
          <Text style={{ width: 62, textAlign: "right" }}>{money(view, item.unitPrice)}</Text>
          {view.showDiscount ? <Text style={{ width: 40, textAlign: "right" }}>{formatQty(item.discountPercent)}%</Text> : null}
          {view.showTax ? <Text style={{ width: 36, textAlign: "right" }}>{formatQty(item.taxRate)}%</Text> : null}
          <Text style={{ width: 70, textAlign: "right" }}>{money(view, item.total)}</Text>
        </View>
      ))}
    </View>
  );
}

function PdfTotals({ view, strongColor }: { view: ViewModel; strongColor?: string }) {
  const row = (label: string, value: string, strong = false) => (
    <View style={{ ...styles.between, marginTop: 3 }} key={label}>
      <Text style={{ color: strong ? strongColor || ink : muted }}>{label}</Text>
      <Text style={{ fontFamily: strong ? "Helvetica-Bold" : "Helvetica", color: strong ? strongColor || ink : ink }}>{value}</Text>
    </View>
  );
  return (
    <View wrap={false} style={{ marginTop: 12, marginLeft: "auto", width: 220 }}>
      {row("Subtotal", money(view, view.subtotal))}
      {view.discountTotal > 0 ? row("Discount given", money(view, view.discountTotal)) : null}
      {view.showTax ? row(view.taxLabel, money(view, view.taxTotal)) : null}
      {row("Total", money(view, view.total), true)}
      {view.type === "invoice" && view.amountPaid > 0 ? row("Amount paid", money(view, view.amountPaid)) : null}
      {view.type === "invoice" && view.amountPaid > 0 ? row("Balance due", money(view, view.balance), true) : null}
      {view.priceNote ? <Text style={{ marginTop: 4, color: muted, fontSize: 8 }}>{view.priceNote}</Text> : null}
    </View>
  );
}

function PdfExtra({ view, qr }: { view: ViewModel; qr: string | null }) {
  return (
    <View wrap={false}>
      {view.notes || view.terms ? (
        <View style={{ ...styles.row, marginTop: 16, gap: 16 }}>
          {view.notes ? (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: muted, marginBottom: 3 }}>NOTES</Text>
              <Text>{view.notes}</Text>
            </View>
          ) : null}
          {view.terms ? (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: muted, marginBottom: 3 }}>TERMS</Text>
              <Text>{view.terms}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {view.banks.length ? (
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 8, color: muted }}>PAYMENT DETAILS</Text>
          <Text style={{ marginTop: 2, fontSize: 8 }}>Use {view.number} as the payment reference.</Text>
          {view.banks.map((bank) => (
            <Text key={bank.id} style={{ marginTop: 3 }}>
              {[bank.bankName, bank.accountName, bank.accountNumber && `Acc ${bank.accountNumber}`, bank.branch && `Branch ${bank.branch}`, bank.swift && `Swift ${bank.swift}`, bank.currency].filter(Boolean).join(" · ")}
            </Text>
          ))}
        </View>
      ) : null}
      {view.fiscal ? (
        <View style={{ marginTop: 12, padding: 8, borderWidth: 0.6, borderColor: line }}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Fiscal details</Text>
          {view.fiscal.number ? <Text>Fiscal number {view.fiscal.number}</Text> : null}
          {view.fiscal.deviceId ? <Text>Device {view.fiscal.deviceId}</Text> : null}
          {view.fiscal.verificationCode ? <Text>Verification {view.fiscal.verificationCode}</Text> : null}
          {qr ? <Image src={qr} style={{ width: 72, height: 72, marginTop: 6 }} /> : null}
        </View>
      ) : null}
      {view.type === "quotation" ? (
        <View style={{ marginTop: 22, width: 220 }}>
          <Text style={{ fontSize: 8, color: muted }}>CUSTOMER ACCEPTANCE</Text>
          <View style={{ marginTop: 18, borderBottomWidth: 0.6, borderBottomColor: ink }} />
          <Text style={{ marginTop: 3, fontSize: 8, color: muted }}>Signature and date</Text>
        </View>
      ) : null}
    </View>
  );
}

function MetaBlock({ view }: { view: ViewModel }) {
  return (
    <View style={{ alignItems: "flex-end" }}>
      <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>{view.title.toUpperCase()}</Text>
      {view.status === "draft" ? <Text style={{ color: "#92400e", marginTop: 2 }}>DRAFT</Text> : null}
      <Text style={{ marginTop: 4 }}>{view.number}</Text>
      <Text style={{ color: muted }}>Issued {formatDate(view.issueDate)}</Text>
      {view.secondaryDate ? <Text style={{ color: muted }}>{view.secondaryDateLabel} {formatDate(view.secondaryDate)}</Text> : null}
      {view.reference ? <Text style={{ color: muted }}>Ref {view.reference}</Text> : null}
    </View>
  );
}

function Parties({ view }: { view: ViewModel }) {
  return (
    <View style={{ ...styles.between, marginTop: 16 }}>
      <View style={{ width: "48%" }}>
        <Text style={{ fontSize: 8, color: muted }}>FROM</Text>
        <Text style={{ marginTop: 3, fontFamily: "Helvetica-Bold" }}>{view.companyName}</Text>
        {view.showLegalName ? <Text style={{ color: muted }}>{view.legalName}</Text> : null}
        {view.companyLines.map((entry) => (
          <Text key={entry} style={{ color: muted }}>{entry}</Text>
        ))}
        {view.companyMeta.map((entry) => (
          <Text key={entry}>{entry}</Text>
        ))}
      </View>
      <View style={{ width: "48%" }}>
        <Text style={{ fontSize: 8, color: muted }}>BILL TO</Text>
        <Text style={{ marginTop: 3, fontFamily: "Helvetica-Bold" }}>{view.clientName}</Text>
        {view.clientLines.map((entry) => (
          <Text key={entry}>{entry}</Text>
        ))}
        {view.clientMeta.map((entry) => (
          <Text key={entry}>{entry}</Text>
        ))}
      </View>
    </View>
  );
}

function Classic({ view, qr }: { view: ViewModel; qr: string | null }) {
  return (
    <Page size="A4" style={styles.classicPage}>
      <View style={{ alignItems: "center", borderBottomWidth: 2, borderBottomColor: ink, paddingBottom: 10 }}>
        {view.logo ? <Image src={view.logo} style={{ height: 48, width: 120, objectFit: "contain", marginBottom: 6 }} /> : null}
        <Text style={{ fontSize: 18 }}>{view.companyName}</Text>
        {view.showLegalName ? <Text style={{ color: muted }}>{view.legalName}</Text> : null}
        {view.companyLines.map((entry) => (
          <Text key={entry} style={{ color: muted, fontSize: 9 }}>{entry}</Text>
        ))}
        <Text style={{ fontSize: 9 }}>{view.companyMeta.join("  ·  ")}</Text>
      </View>
      <View style={{ ...styles.between, marginTop: 14 }}>
        <View style={{ width: "55%" }}>
          <Text style={{ fontSize: 8 }}>BILL TO</Text>
          <Text style={{ marginTop: 3, fontSize: 12 }}>{view.clientName}</Text>
          {view.clientLines.map((entry) => (
            <Text key={entry}>{entry}</Text>
          ))}
          {view.clientMeta.map((entry) => (
            <Text key={entry}>{entry}</Text>
          ))}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 16 }}>{view.title}</Text>
          {view.status === "draft" ? <Text>DRAFT</Text> : null}
          <Text>{view.number}</Text>
          <Text>Issued {formatDate(view.issueDate)}</Text>
          {view.secondaryDate ? <Text>{view.secondaryDateLabel} {formatDate(view.secondaryDate)}</Text> : null}
          {view.reference ? <Text>Ref {view.reference}</Text> : null}
        </View>
      </View>
      <PdfItems view={view} headerBg="#f4f1ea" headerColor={ink} />
      <PdfTotals view={view} />
      <PdfExtra view={view} qr={qr} />
      <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${view.number}  ·  ${pageNumber} / ${totalPages}`} />
    </Page>
  );
}

function Modern({ view, qr }: { view: ViewModel; qr: string | null }) {
  return (
    <Page size="A4" style={{ ...styles.sansPage, borderLeftWidth: 10, borderLeftColor: moss }}>
      <View style={styles.between}>
        <View style={{ width: "60%" }}>
          {view.logo ? <Image src={view.logo} style={{ height: 42, width: 110, objectFit: "contain", marginBottom: 8 }} /> : null}
          <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: moss }}>{view.companyName}</Text>
          {view.companyLines.map((entry) => (
            <Text key={entry} style={{ color: muted }}>{entry}</Text>
          ))}
          <Text>{view.companyMeta.join("  ·  ")}</Text>
        </View>
        <MetaBlock view={view} />
      </View>
      <View style={{ marginTop: 14, padding: 8, backgroundColor: "#f3faf6" }}>
        <Text style={{ fontSize: 8, color: moss }}>BILL TO</Text>
        <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 2 }}>{view.clientName}</Text>
        {view.clientLines.map((entry) => (
          <Text key={entry}>{entry}</Text>
        ))}
      </View>
      <PdfItems view={view} headerBg={moss} headerColor="#ffffff" />
      <PdfTotals view={view} strongColor={moss} />
      <PdfExtra view={view} qr={qr} />
      <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${view.number}  ·  ${pageNumber} / ${totalPages}`} />
    </Page>
  );
}

function Minimal({ view, qr }: { view: ViewModel; qr: string | null }) {
  return (
    <Page size="A4" style={styles.sansPage}>
      <View style={styles.between}>
        <View>
          {view.logo ? <Image src={view.logo} style={{ height: 36, width: 90, objectFit: "contain", marginBottom: 8 }} /> : null}
          <Text style={{ fontSize: 11 }}>{view.companyName}</Text>
          {view.companyLines.map((entry) => (
            <Text key={entry} style={{ color: muted, fontSize: 8 }}>{entry}</Text>
          ))}
        </View>
        <Text style={{ fontSize: 22, color: "#c8c2b6" }}>{view.title}</Text>
      </View>
      <View style={{ ...styles.between, marginTop: 22 }}>
        <View>
          <Text style={{ fontSize: 8, color: muted }}>BILL TO</Text>
          <Text style={{ marginTop: 3 }}>{view.clientName}</Text>
          {view.clientLines.map((entry) => (
            <Text key={entry} style={{ color: muted }}>{entry}</Text>
          ))}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {view.status === "draft" ? <Text style={{ fontSize: 8 }}>DRAFT</Text> : null}
          <Text>{view.number}</Text>
          <Text style={{ color: muted }}>{formatDate(view.issueDate)}</Text>
          {view.secondaryDate ? <Text style={{ color: muted }}>{view.secondaryDateLabel} {formatDate(view.secondaryDate)}</Text> : null}
        </View>
      </View>
      <PdfItems view={view} headerBg={paper} headerColor={muted} />
      <PdfTotals view={view} />
      <PdfExtra view={view} qr={qr} />
      <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${view.companyMeta.join(" · ")}  ·  ${pageNumber} / ${totalPages}`} />
    </Page>
  );
}

function Corporate({ view, qr }: { view: ViewModel; qr: string | null }) {
  return (
    <Page size="A4" style={styles.bleedPage}>
      <View style={{ backgroundColor: "#14211c", color: "#f3f0e8", paddingHorizontal: 32, paddingTop: 26, paddingBottom: 18 }}>
        <View style={styles.between}>
          <View>
            {view.logo ? <Image src={view.logo} style={{ height: 40, width: 100, objectFit: "contain", marginBottom: 8 }} /> : null}
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>{view.companyName}</Text>
            {view.showLegalName ? <Text style={{ fontSize: 8, color: "#c9c3b6" }}>{view.legalName}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>{view.title.toUpperCase()}</Text>
            <Text style={{ marginTop: 4 }}>{view.number}</Text>
            {view.status === "draft" ? <Text style={{ color: "#e7c98a" }}>DRAFT</Text> : null}
          </View>
        </View>
      </View>
      <View style={{ backgroundColor: "#efeae1", paddingHorizontal: 32, paddingVertical: 10, ...styles.between }}>
        <View style={{ width: "48%" }}>
          <Text style={{ fontSize: 8, color: muted }}>BILL TO</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{view.clientName}</Text>
          {view.clientLines.map((entry) => (
            <Text key={entry}>{entry}</Text>
          ))}
        </View>
        <View style={{ width: "48%", alignItems: "flex-end" }}>
          <Text>Issued {formatDate(view.issueDate)}</Text>
          {view.secondaryDate ? <Text>{view.secondaryDateLabel} {formatDate(view.secondaryDate)}</Text> : null}
          {view.reference ? <Text>Ref {view.reference}</Text> : null}
          <Text style={{ color: muted }}>{view.companyMeta.join(" · ")}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 32, paddingTop: 8 }}>
        <PdfItems view={view} headerBg="#14211c" headerColor="#f3f0e8" zebra="#f7f4ee" />
        <PdfTotals view={view} />
        <PdfExtra view={view} qr={qr} />
      </View>
      <Text style={{ ...styles.footer, color: "#8d867a" }} fixed render={({ pageNumber, totalPages }) => `${view.number}  ·  ${pageNumber} / ${totalPages}`} />
    </Page>
  );
}

function PdfDocument({ view, qr }: { view: ViewModel; qr: string | null }) {
  const page =
    view.templateId === "modern" ? (
      <Modern view={view} qr={qr} />
    ) : view.templateId === "minimal" ? (
      <Minimal view={view} qr={qr} />
    ) : view.templateId === "corporate" ? (
      <Corporate view={view} qr={qr} />
    ) : (
      <Classic view={view} qr={qr} />
    );
  return <PdfRoot>{page}</PdfRoot>;
}

export async function renderDocumentPdf(doc: BusinessDocument, company: CompanyDetails) {
  ensureFonts();
  const view = present(doc, company);
  let qr: string | null = null;
  if (view.fiscal?.qr) {
    try {
      qr = await QRCode.toDataURL(view.fiscal.qr, { margin: 1, width: 140 });
    } catch {
      qr = null;
    }
  }
  return renderToBuffer(<PdfDocument view={view} qr={qr} />);
}
