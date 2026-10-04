package com.solargridlk.mobile.ui.gridoperator

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.MicrogridNode
import com.solargridlk.mobile.data.repository.OperatorNodeRepository
import com.solargridlk.mobile.ui.auth.LoginActivity
import com.solargridlk.mobile.utils.SessionManager
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.IOException

class NodeOperationsActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager
    private lateinit var repository: OperatorNodeRepository
    private lateinit var adapter: NodeCardAdapter
    private lateinit var activeNodesText: TextView
    private lateinit var availableSlotsText: TextView
    private lateinit var errorText: TextView
    private lateinit var retryButton: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var searchInput: EditText

    private var nodes: List<MicrogridNode> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        // Open the Grid Operator node list for the signed-in operator.
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_node_operations)

        sessionManager = SessionManager(this)
        if (!sessionManager.isLoggedIn() || sessionManager.getRole() != "GridOperator") {
            openLogin()
            return
        }

        repository = OperatorNodeRepository(RetrofitClient.getOperatorNodeApi(this))
        activeNodesText = findViewById(R.id.activeNodesText)
        availableSlotsText = findViewById(R.id.availableSlotsText)
        errorText = findViewById(R.id.errorText)
        retryButton = findViewById(R.id.retryButton)
        progressBar = findViewById(R.id.progressBar)
        searchInput = findViewById(R.id.searchInput)

        adapter = NodeCardAdapter { node ->
            val nodeId = node.nodeId ?: return@NodeCardAdapter
            startActivity(
                Intent(this, NodeOperationDetailsActivity::class.java)
                    .putExtra(NodeOperationDetailsActivity.EXTRA_NODE_ID, nodeId)
            )
        }

        findViewById<RecyclerView>(R.id.nodesRecyclerView).apply {
            layoutManager = LinearLayoutManager(this@NodeOperationsActivity)
            this.adapter = this@NodeOperationsActivity.adapter
        }

        findViewById<View>(R.id.backButton).setOnClickListener { finish() }
        retryButton.setOnClickListener { loadNodes() }
        searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                showFiltered(s?.toString().orEmpty())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    override fun onResume() {
        // Reload from the API so a battery update is visible when returning from details.
        super.onResume()
        if (::repository.isInitialized) {
            loadNodes()
        }
    }

    private fun loadNodes() {
        // Fetch nodes assigned to this operator. The API filters using the JWT.
        progressBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE
        retryButton.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val response = repository.getNodes()
                progressBar.visibility = View.GONE

                if (response.code() == 401) {
                    sessionManager.clearSession()
                    openLogin()
                    return@launch
                }

                if (!response.isSuccessful || response.body()?.success != true) {
                    showError(apiMessage(response.errorBody()?.string(), response.body()?.message, "Unable to load nodes."))
                    return@launch
                }

                nodes = response.body()?.data.orEmpty()
                bindSummary(nodes)
                showFiltered(searchInput.text?.toString().orEmpty())
            } catch (_: IOException) {
                progressBar.visibility = View.GONE
                showError("Unable to connect to the server.")
            }
        }
    }

    private fun bindSummary(source: List<MicrogridNode>) {
        // Show counts from the loaded nodes.
        activeNodesText.text = source.count { it.status == "Active" }.toString()
        availableSlotsText.text = source.sumOf { it.availableBatterySlots ?: 0 }.toString()
    }

    private fun showFiltered(query: String) {
        // Filter the loaded list without calling the API again.
        val term = query.trim()
        val visible = if (term.isEmpty()) {
            nodes
        } else {
            nodes.filter { node ->
                listOf(node.nodeId, node.name, node.location, node.status)
                    .any { it?.contains(term, ignoreCase = true) == true }
            }
        }
        adapter.submit(visible)
    }

    private fun showError(message: String) {
        // Show a load failure and offer another attempt.
        errorText.text = message
        errorText.visibility = View.VISIBLE
        retryButton.visibility = View.VISIBLE
    }

    private fun openLogin() {
        // Leave the operator screens when the session is missing or rejected.
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private class NodeCardAdapter(
        private val onView: (MicrogridNode) -> Unit
    ) : RecyclerView.Adapter<NodeCardAdapter.Holder>() {

        private val items = mutableListOf<MicrogridNode>()

        fun submit(nodes: List<MicrogridNode>) {
            items.clear()
            items.addAll(nodes)
            notifyDataSetChanged()
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_operator_node, parent, false)
            return Holder(view)
        }

        override fun onBindViewHolder(holder: Holder, position: Int) {
            holder.bind(items[position], onView)
        }

        override fun getItemCount(): Int = items.size

        class Holder(view: View) : RecyclerView.ViewHolder(view) {
            private val nodeIdText: TextView = view.findViewById(R.id.nodeIdText)
            private val nodeNameText: TextView = view.findViewById(R.id.nodeNameText)
            private val nodeStatusText: TextView = view.findViewById(R.id.nodeStatusText)
            private val nodeBatteryText: TextView = view.findViewById(R.id.nodeBatteryText)
            private val viewNodeButton: TextView = view.findViewById(R.id.viewNodeButton)

            fun bind(node: MicrogridNode, onView: (MicrogridNode) -> Unit) {
                val active = node.status == "Active"
                nodeIdText.text = node.nodeId ?: "—"
                nodeNameText.text = node.name ?: "—"
                nodeStatusText.text = if (active) "● Active" else "● ${node.status ?: "Unknown"}"
                nodeStatusText.setTextColor(
                    itemView.context.getColor(if (active) R.color.success else R.color.error)
                )
                nodeBatteryText.text = "Battery: ${node.availableBatterySlots ?: 0} slots available"
                viewNodeButton.setOnClickListener { onView(node) }
                itemView.setOnClickListener { onView(node) }
            }
        }
    }
}

internal fun apiMessage(errorBody: String?, bodyMessage: String?, fallback: String): String {
    if (!bodyMessage.isNullOrBlank()) {
        return bodyMessage
    }

    return try {
        val message = JSONObject(errorBody ?: "").optString("message")
        message.ifBlank { fallback }
    } catch (_: Exception) {
        fallback
    }
}
