using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace RegisterApi.Services;

public class ReceiptService : IReceiptService
{
    // ── Change these to match your business ──────────────────────────────────
    private const string CompanyName = "YOUR COMPANY NAME";
    private const string CompanyAddress = "Your Company Address, City, State, PIN";
    private const string CompanySupportEmail = "support@yourcompany.com";
    // ──────────────────────────────────────────────────────────────────────────

    private static readonly CultureInfo Inr = CultureInfo.GetCultureInfo("en-IN");

    public byte[] GenerateReceiptPdf(ReceiptData data)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10));

                // ── Header ──────────────────────────────────────────────
                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(CompanyName).FontSize(18).Bold();
                            c.Item().Text(CompanyAddress).FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(CompanySupportEmail).FontSize(8).FontColor(Colors.Grey.Darken1);
                        });

                        row.ConstantItem(180).Column(c =>
                        {
                            c.Item().AlignRight().Text("PAYMENT RECEIPT").FontSize(13).Bold().FontColor(Colors.Blue.Darken2);
                            c.Item().AlignRight().Text($"Receipt No: ORD-{data.OrderId:D6}");
                            c.Item().AlignRight().Text($"Date: {data.ReceiptDate:dd MMM yyyy, hh:mm tt}");
                        });
                    });

                    col.Item().PaddingTop(12).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                // ── Body ────────────────────────────────────────────────
                page.Content().PaddingVertical(15).Column(col =>
                {
                    col.Spacing(16);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Billed To").SemiBold().FontColor(Colors.Grey.Darken2);
                            c.Item().Text(data.CustomerName);
                            c.Item().Text($"User ID: {data.UserId}");
                        });

                        row.RelativeItem().Column(c =>
                        {
                            c.Item().AlignRight().Text("Payment Details").SemiBold().FontColor(Colors.Grey.Darken2);
                            c.Item().AlignRight().Text($"UTR / Transaction ID: {data.UtrNumber}");
                            c.Item().AlignRight().Text(text =>
                            {
                                text.Span("Status: ");
                                text.Span("APPROVED").Bold().FontColor(Colors.Green.Darken2);
                            });
                        });
                    });

                    col.Item().Element(c => ComposeItemsTable(c, data.Items, data.TotalAmount));

                    col.Item().AlignRight().Column(c =>
                    {
                        c.Item().Text($"Total BV: {data.TotalBv.ToString("0.##", Inr)}").FontSize(9).FontColor(Colors.Grey.Darken1);
                        c.Item().PaddingTop(4).Text($"Total Paid: Rs. {data.TotalAmount.ToString("N2", Inr)}")
                            .FontSize(13).Bold();
                    });

                    if (!string.IsNullOrWhiteSpace(data.Notes))
                    {
                        col.Item().Background(Colors.Grey.Lighten4).Padding(8).Text(text =>
                        {
                            text.Span("Notes: ").SemiBold();
                            text.Span(data.Notes);
                        });
                    }
                });

                // ── Footer ──────────────────────────────────────────────
                page.Footer().PaddingTop(10).Column(col =>
                {
                    col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
                    col.Item().PaddingTop(6).AlignCenter().Text(
                        "This is a system-generated receipt and does not require a signature.")
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });
        });

        return document.GeneratePdf();
    }

    private static void ComposeItemsTable(IContainer container, List<ReceiptItemData> items, decimal fallbackTotal)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.RelativeColumn(4);
                columns.RelativeColumn(1);
                columns.RelativeColumn(2);
                columns.RelativeColumn(2);
            });

            table.Header(header =>
            {
                header.Cell().Element(HeaderCell).Text("Item");
                header.Cell().Element(HeaderCell).AlignCenter().Text("Qty");
                header.Cell().Element(HeaderCell).AlignRight().Text("Unit Price");
                header.Cell().Element(HeaderCell).AlignRight().Text("Amount");

                static IContainer HeaderCell(IContainer c) =>
                    c.DefaultTextStyle(x => x.SemiBold())
                     .PaddingVertical(5)
                     .BorderBottom(1)
                     .BorderColor(Colors.Grey.Darken1);
            });

            if (items.Count == 0)
            {
                // No parseable line items — fall back to a single summary row
                table.Cell().ColumnSpan(3).Element(BodyCell).Text("Order items");
                table.Cell().Element(BodyCell).AlignRight().Text($"Rs. {fallbackTotal.ToString("N2", Inr)}");
            }
            else
            {
                foreach (var item in items)
                {
                    var lineTotal = item.Quantity.HasValue && item.UnitPrice.HasValue
                        ? item.Quantity * item.UnitPrice
                        : (decimal?)null;

                    table.Cell().Element(BodyCell).Text(item.Name);
                    table.Cell().Element(BodyCell).AlignCenter().Text(item.Quantity?.ToString("0.##", Inr) ?? "-");
                    table.Cell().Element(BodyCell).AlignRight().Text(
                        item.UnitPrice.HasValue ? $"Rs. {item.UnitPrice.Value.ToString("N2", Inr)}" : "-");
                    table.Cell().Element(BodyCell).AlignRight().Text(
                        lineTotal.HasValue ? $"Rs. {lineTotal.Value.ToString("N2", Inr)}" : "-");
                }
            }

            static IContainer BodyCell(IContainer c) =>
                c.PaddingVertical(5).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2);
        });
    }
}
