package com.solargridlk.mobile.ui.gridoperator

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.ImageButton
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.NodeApiClient
import com.solargridlk.mobile.data.local.AppDatabase
import com.solargridlk.mobile.data.local.NodeDao
import com.solargridlk.mobile.data.local.NodeEntity
import com.solargridlk.mobile.data.model.Node
import kotlinx.coroutines.launch

class NodesMapActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var map: GoogleMap
    private lateinit var areaSpinner: Spinner
    private var allNodes: List<Node> = emptyList()
    private var isPickerMode: Boolean = false

    private val sampleNodes = listOf(
        Node("NODE-001", "Colombo Fort Hub", 6.9344, 79.8428, "Active", 25.0, "Colombo"),
        Node("NODE-002", "Nugegoda Substation", 6.8649, 79.8997, "Active", 18.0, "Colombo"),
        Node("NODE-003", "Moratuwa Solar Cluster", 6.7730, 79.8816, "Offline", 12.0, "Colombo"),
        Node("NODE-004", "Kandy Grid Point", 7.2906, 80.6337, "Active", 20.0, "Kandy"),
        Node("NODE-005", "Galle Coastal Node", 6.0535, 80.2210, "Active", 15.0, "Galle")
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_nodes_map)

        isPickerMode = intent.getBooleanExtra("IS_PICKER_MODE", false)

        findViewById<ImageButton>(R.id.backButton).setOnClickListener { finish() }
        areaSpinner = findViewById(R.id.areaSpinner)

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.mapFragment) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    override fun onMapReady(googleMap: GoogleMap) {
        map = googleMap
        map.uiSettings.isZoomControlsEnabled = true
        map.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(7.8731, 80.7718), 7f))

        map.setOnMarkerClickListener { marker ->
            val selectedNode = allNodes.find { (it.name ?: it.id ?: "") == marker.title || it.id == marker.title }

            if (isPickerMode && selectedNode != null) {
                val isActive = selectedNode.status?.equals("Active", ignoreCase = true) == true
                if (!isActive) {
                    Toast.makeText(this, "This node is currently offline. Please select an active node.", Toast.LENGTH_SHORT).show()
                    return@setOnMarkerClickListener true
                }

                val resultIntent = Intent().apply {
                    putExtra("SELECTED_NODE_ID", selectedNode.id)
                    putExtra("SELECTED_NODE_NAME", selectedNode.name ?: selectedNode.id)
                }
                setResult(RESULT_OK, resultIntent)
                finish()
                true
            } else {
                false
            }
        }

        loadNodes()
    }

    private fun loadNodes() {
        lifecycleScope.launch {
            val dao = AppDatabase.get(this@NodesMapActivity).nodeDao()

            val nodes: List<Node> = try {
                val res = NodeApiClient.create(this@NodesMapActivity).getNodes()
                val live = res.body()?.data
                if (res.isSuccessful && !live.isNullOrEmpty()) {
                    dao.upsertAll(
                        live.filter { it.id != null }.map {
                            NodeEntity(it.id!!, it.name, it.latitude, it.longitude, it.status, it.capacityKw, it.location)
                        }
                    )
                    live
                } else {
                    loadCachedOrSample(dao)
                }
            } catch (e: Exception) {
                loadCachedOrSample(dao)
            }

            allNodes = nodes
            setupAreaFilter(nodes)
            plotNodes(nodes)
        }
    }

    private suspend fun loadCachedOrSample(dao: NodeDao): List<Node> {
        val cached = dao.getAll()
        return if (cached.isNotEmpty()) {
            Toast.makeText(this, "Offline — showing last saved nodes", Toast.LENGTH_SHORT).show()
            cached.map { Node(it.id, it.name, it.latitude, it.longitude, it.status, it.capacityKw, it.location) }
        } else {
            Toast.makeText(this, "Offline — showing sample nodes", Toast.LENGTH_SHORT).show()
            sampleNodes
        }
    }

    private fun setupAreaFilter(nodes: List<Node>) {
        val areas = listOf("All areas") +
            nodes.mapNotNull { it.location?.trim() }.filter { it.isNotEmpty() }.distinct().sorted()

        val adapter = ArrayAdapter(this, R.layout.spinner_item, areas)
        adapter.setDropDownViewResource(R.layout.spinner_item)
        areaSpinner.adapter = adapter

        areaSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selected = areas[position]
                val filtered = if (position == 0) allNodes
                    else allNodes.filter { it.location?.trim().equals(selected, ignoreCase = true) }
                plotNodes(filtered)
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    private fun plotNodes(nodes: List<Node>) {
        if (!::map.isInitialized) return
        map.clear()

        val boundsBuilder = LatLngBounds.Builder()
        var plotted = 0

        for (node in nodes) {
            val lat = node.latitude ?: continue
            val lng = node.longitude ?: continue
            if (lat !in 5.5..10.2 || lng !in 79.2..82.2) continue
            val pos = LatLng(lat, lng)

            val color = if (node.status?.equals("Active", true) == true)
                BitmapDescriptorFactory.HUE_GREEN
            else
                BitmapDescriptorFactory.HUE_RED

            val snippet = buildString {
                node.status?.let { append("Status: $it") }
                node.capacityKw?.let { append("  ·  ${it}kW") }
            }

            map.addMarker(
                MarkerOptions()
                    .position(pos)
                    .title(node.name ?: node.id ?: "Node")
                    .snippet(snippet)
                    .icon(BitmapDescriptorFactory.defaultMarker(color))
            )
            boundsBuilder.include(pos)
            plotted++
        }

        if (plotted > 0) {
            map.moveCamera(CameraUpdateFactory.newLatLngBounds(boundsBuilder.build(), 120))
        }
    }
}