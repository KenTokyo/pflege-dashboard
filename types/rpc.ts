import type { Database } from "./database.types.js";

/** Actual Phase-1 SQL contract. CLI function args do not infer nullable inputs. */
type Functions = Database["public"]["Functions"];
type Mode = Database["public"]["Enums"]["agent_mode"];
type Status = Database["public"]["Enums"]["document_status"];
export type UpdateAgentSettingsArgs = {
  p_workspace_id: string;
  p_mode: Mode;
  p_model_id: string | null;
  p_expected_revision: number;
} & (
  | {
      p_reset_to_default: true;
      p_persona: string | null;
      p_system_prompt: string | null;
    }
  | { p_reset_to_default: false; p_persona: string; p_system_prompt: string }
);
export type Phase0Functions = {
  rename_conversation: {
    Args: {
      p_conversation_id: string;
      p_title: string;
      p_expected_revision: number;
    };
    Returns: Functions["rename_conversation"]["Returns"];
  };
  set_conversation_preferences: {
    Args: {
      p_conversation_id: string;
      p_mode: Mode | null;
      p_model_id: string | null;
      p_archived: boolean;
      p_expected_revision: number;
    };
    Returns: Functions["set_conversation_preferences"]["Returns"];
  };
  mark_document_status: {
    Args: {
      p_document_id: string;
      p_status: Status;
      p_expected_revision: number;
    };
    Returns: Functions["mark_document_status"]["Returns"];
  };
  update_agent_settings: {
    Args: UpdateAgentSettingsArgs;
    Returns: Functions["update_agent_settings"]["Returns"];
  };
};
/** Use this type for the later Supabase JS client; tables/enums remain CLI-generated. */
export type BackendDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: {
      [K in keyof Phase0Functions]: Omit<Functions[K], "Args"> & {
        Args: Phase0Functions[K]["Args"];
      };
    } & {
      staff_overview: {
        Args: { p_workspace_id: string };
        Returns: import("./staff.js").StaffOverview;
      };
      create_conversation: Omit<Functions["create_conversation"], "Args"> & {
        Args: import("./phase1.js").CreateConversationArgs;
        Returns: Functions["create_conversation"]["Returns"];
      };
      assign_conversation_recipient: Omit<
        Functions["assign_conversation_recipient"],
        "Args"
      > & {
        Args: import("./phase1.js").AssignConversationRecipientArgs;
        Returns: Functions["assign_conversation_recipient"]["Returns"];
      };
    };
  };
};
