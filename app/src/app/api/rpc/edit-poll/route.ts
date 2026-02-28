import { createAdminRpcHandler } from "../_handler";
import { EditPollInput, zodValidator } from "../_validation";

export const POST = createAdminRpcHandler(
    "edit_poll_atomic",
    (wallet, body) => ({
        p_wallet: wallet,
        p_poll_id: body.p_poll_id,
        p_title: body.p_title,
        p_description: body.p_description,
        p_category: body.p_category,
        p_image_url: body.p_image_url,
        p_option_images: body.p_option_images,
        p_options: body.p_options,
        p_end_time: body.p_end_time,
    }),
    zodValidator(EditPollInput)
);
