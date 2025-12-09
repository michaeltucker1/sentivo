import { useMemo, useState } from "react";

const AIRTABLE_TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;

const categories = [
    { label: "Bug", value: "Bug" },
    { label: "Feature Request", value: "Feature" },
    { label: "Other", value: "Other" }
];

const Feedback = () => {
    const [category, setCategory] = useState(categories[0].value);
    const [userEmail, setUserEmail] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<"idle" | "error" | "sent" | "sending">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const hasAirtableConfig = Boolean(AIRTABLE_TOKEN);
    const canSend = useMemo(() => {
        const emailValid = userEmail.trim().length > 0 && userEmail.includes("@");
        const messageValid = message.trim().length > 0;
        return emailValid && messageValid;
    }, [userEmail, message]);

    const handleSend = () => {
        console.log("hasAirtableConfig", hasAirtableConfig);
        console.log("AIRTABLE_TOKEN", AIRTABLE_TOKEN);
        const emailValid = userEmail.trim().length > 0 && userEmail.includes("@");
        const messageValid = message.trim().length > 0;
        
        if (!emailValid) {
            setStatus("error");
            setErrorMessage("Please enter a valid email address.");
            return;
        }
        
        if (!messageValid) {
            setStatus("error");
            setErrorMessage("Add some details before sending.");
            return;
        }

        if (!hasAirtableConfig) {
            setStatus("error");
            setErrorMessage("Airtable configuration missing.");
            return;
        }

        setStatus("sending");
        setErrorMessage("");

        window.api.sendFeedback({
            category,
            userEmail: userEmail.trim(),
            message: message.trim()
        })
            .then(() => {
                setStatus("sent");
                setMessage("");
                setUserEmail("");
            })
            .catch(() => {
                setStatus("error");
                setErrorMessage("We couldn't send that. Please try again.");
            });
    };

    return (
        <div className="max-w-2xl space-y-5">
            <div>
                <h1 className="text-lg font-medium">Share feedback</h1>
                <p className="text-sm text-[#6b6b7b]">Tell us what to improve. This will send an email to the Sentivo team.</p>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-[#3f3f45]" htmlFor="feedback-category">Feedback type</label>
                <select
                    id="feedback-category"
                    className="w-full rounded-md border border-[#d4d4d8] bg-white px-3 py-2 text-[12px] focus:border-[#2c3cca] focus:outline-none"
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
                <label className="text-sm font-medium text-[#3f3f45]" htmlFor="feedback-email">Your email *</label>
                <input
                    id="feedback-email"
                    type="email"
                    className="w-full rounded-md border border-[#d4d4d8] bg-white px-3 py-2 text-[12px] focus:border-[#2c3cca] focus:outline-none"
                    placeholder="your.email@example.com"
                    value={userEmail}
                    onChange={(evt) => {
                        setUserEmail(evt.target.value);
                        setStatus("idle");
                    }}
                />
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-[#3f3f45]" htmlFor="feedback-message">Details</label>
                <textarea
                    id="feedback-message"
                    rows={6}
                    className="w-full resize-none rounded-md border border-[#d4d4d8] px-3 py-2 text-[12px] focus:border-[#2c3cca] focus:outline-none"
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
                        setUserEmail("");
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
