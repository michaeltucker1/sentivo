import { useMemo, useState } from "react";
import emailjs from "@emailjs/browser";

const DEFAULT_FEEDBACK_EMAIL = "sentivo.contact@gmail.com";
const TARGET_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL ?? DEFAULT_FEEDBACK_EMAIL;
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
// const TARGET_EMAIL = process.env.FEEDBACK_EMAIL ?? DEFAULT_FEEDBACK_EMAIL;
// const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
// const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
// const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;

const categories = [
    { label: "Bug", value: "Bug" },
    { label: "Feature Request", value: "Feature" },
    { label: "Other", value: "Other" }
];

const Feedback = () => {
    const [category, setCategory] = useState(categories[0].value);
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<"idle" | "error" | "sent" | "sending">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    console.log(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY);
    const hasEmailJsConfig = Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
    const canSend = useMemo(() => message.trim().length > 0, [message]);

    const handleSend = () => {
        if (!message.trim().length) {
            setStatus("error");
            setErrorMessage("Add some details before sending.");
            return;
        }

        if (!hasEmailJsConfig) {
            setStatus("error");
            setErrorMessage("Feedback email configuration missing.");
            return;
        }

        setStatus("sending");
        setErrorMessage("");

        emailjs
            .send(
                EMAILJS_SERVICE_ID!,
                EMAILJS_TEMPLATE_ID!,
                {
                    category,
                    message: message.trim(),
                    to_email: TARGET_EMAIL
                },
                EMAILJS_PUBLIC_KEY
            )
            .then(() => {
                setStatus("sent");
                setMessage("");
            })
            .catch(() => {
                setStatus("error");
                setErrorMessage("We couldn't send that. Please try again.");
            });
    };

    return (
        <div className="max-w-2xl space-y-5">
            <div>
                <h1 className="text-2xl font-medium">Share feedback</h1>
                <p className="text-lg text-[#6b6b7b]">Tell us what to improve. Sending emails the Sentivo team directly{hasEmailJsConfig ? "." : ", but setup is incomplete in this build."}</p>
            </div>

            <div className="space-y-1">
                <label className="text-md font-medium text-[#3f3f45]" htmlFor="feedback-category">Feedback type</label>
                <select
                    id="feedback-category"
                    className="w-full rounded-md border border-[#d4d4d8] bg-white px-3 py-2 text-[16px] focus:border-[#2c3cca] focus:outline-none"
                    value={category}
                    onChange={(evt) => setCategory(evt.target.value)}
                >
                    {categories.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-md font-medium text-[#3f3f45]" htmlFor="feedback-message">Details</label>
                <textarea
                    id="feedback-message"
                    rows={6}
                    className="w-full resize-none rounded-md border border-[#d4d4d8] px-3 py-2 text-[16px] focus:border-[#2c3cca] focus:outline-none"
                    placeholder="Share as much detail as you can so we can help quickly"
                    value={message}
                    onChange={(evt) => {
                        setMessage(evt.target.value);
                        setStatus("idle");
                    }}
                />
            </div>

            {status === "error" && (
                <p className="text-sm text-[#dc2626]">{errorMessage}</p>
            )}
            {status === "sent" && (
                <p className="text-sm text-[#16a34a]">Thanks for your feedback!</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend || status === "sending"}
                    className={`rounded-md px-4 py-2 text-sm font-medium text-white transition ${canSend && status !== "sending" ? "bg-[#2c3cca] hover:bg-[#2530a6]" : "bg-[#babac3] cursor-not-allowed"}`}
                >
                    {status === "sending" ? "Sending…" : "Send feedback"}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMessage("");
                        setStatus("idle");
                    }}
                    className="rounded-md border border-transparent px-4 py-2 text-sm font-medium text-[#2c3cca] hover:bg-[#e0e7ff]"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

export default Feedback;
