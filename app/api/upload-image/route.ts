import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function sanitizeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = getSupabaseAdminClient();
        const formData = await request.formData();
        const files = formData.getAll("files");
        const legacyFile = formData.get("file") as File | null;

        const selectedFiles = [...files, legacyFile].filter((item): item is File => item instanceof File);

        if (selectedFiles.length === 0) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const invalidFile = selectedFiles.find((file) => !file.type.startsWith("image/"));
        if (invalidFile) {
            return NextResponse.json({ error: "File must be an image" }, { status: 400 });
        }

        const uploadedImages = await Promise.all(
            selectedFiles.map(async (file) => {
                const key = `images/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitizeFileName(file.name)}`;
                const { data, error } = await supabase.storage
                    .from("lemon")
                    .upload(key, file);

                if (error) {
                    throw new Error(`Failed to upload ${file.name}`)
                }

                const { data: urlData } = supabase.storage.from("lemon").getPublicUrl(key)

                return {
                    key: data?.path,
                    url: urlData?.publicUrl,
                };
            })
        )

        return NextResponse.json({
            images: uploadedImages,
            image: uploadedImages[0] ?? null,
        });

    } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
}
