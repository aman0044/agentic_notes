"""Telegram bot for Agentic Notes."""
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

_application = None


def get_notes_db_fn(fn):
    """Injected at startup to avoid circular imports."""
    global _get_notes, _create_note, _search_notes, _answer_question
    _get_notes = fn


async def start_bot(
    get_notes_fn,
    create_note_fn,
    search_notes_fn,
    answer_fn,
):
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.info("No Telegram token configured, bot disabled.")
        return

    try:
        from telegram import Update
        from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

        app = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()

        async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
            await update.message.reply_text(
                "👋 *Agentic Notes Bot*\n\n"
                "/note <text> — Create a quick note\n"
                "/search <query> — Search notes\n"
                "/ask <question> — Ask a question about your notes\n"
                "/recent — Show 5 recent notes",
                parse_mode="Markdown",
            )

        async def cmd_note(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
            text = " ".join(ctx.args)
            if not text:
                await update.message.reply_text("Usage: /note <your note text>")
                return
            note = await create_note_fn(title=text[:80], content=text)
            await update.message.reply_text(f"✅ Note saved: *{note.title}*", parse_mode="Markdown")

        async def cmd_search(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
            query = " ".join(ctx.args)
            if not query:
                await update.message.reply_text("Usage: /search <query>")
                return
            notes = await search_notes_fn(query, limit=5)
            if not notes:
                await update.message.reply_text("No notes found.")
                return
            lines = [f"🔍 *Results for '{query}'*\n"]
            for n in notes:
                lines.append(f"• *{n.title}* — {(n.summary or n.content[:80]).strip()}...")
            await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

        async def cmd_ask(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
            question = " ".join(ctx.args)
            if not question:
                await update.message.reply_text("Usage: /ask <question>")
                return
            await update.message.reply_text("⏳ Thinking...")
            answer = await answer_fn(question)
            await update.message.reply_text(answer)

        async def cmd_recent(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
            notes = await get_notes_fn(limit=5)
            if not notes:
                await update.message.reply_text("No notes yet.")
                return
            lines = ["📝 *Recent Notes*\n"]
            for n in notes:
                lines.append(f"• *{n.title}*")
            await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

        app.add_handler(CommandHandler("start", cmd_start))
        app.add_handler(CommandHandler("note", cmd_note))
        app.add_handler(CommandHandler("search", cmd_search))
        app.add_handler(CommandHandler("ask", cmd_ask))
        app.add_handler(CommandHandler("recent", cmd_recent))

        global _application
        _application = app
        await app.initialize()
        await app.start()
        await app.updater.start_polling()
        logger.info("Telegram bot started")
    except Exception as e:
        logger.error(f"Telegram bot failed to start: {e}")


async def stop_bot():
    global _application
    if _application:
        try:
            await _application.updater.stop()
            await _application.stop()
            await _application.shutdown()
        except Exception as e:
            logger.error(f"Error stopping Telegram bot: {e}")
