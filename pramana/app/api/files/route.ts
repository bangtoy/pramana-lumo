import { handle, fail } from "@/lib/http";
import { saveUpload } from "@/lib/files";
export const runtime="nodejs";
export const POST=handle(async (request:Request)=>{
  const form=await request.formData();
  const file=form.get("file");
  if(!(file instanceof File)) fail("Choose a file to upload.");
  const saved=await saveUpload(file);
  return Response.json({id:saved.id,mime:saved.mime,name:saved.name,caption:saved.caption},{status:201});
});
